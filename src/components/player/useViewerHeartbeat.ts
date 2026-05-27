'use client'

import { useEffect, useRef, useState } from 'react'

const isDev = process.env.NODE_ENV !== 'production'

interface UseViewerHeartbeatOptions {
  isPlaying: boolean
  isActive: boolean
}

export function useViewerHeartbeat({ isPlaying, isActive }: UseViewerHeartbeatOptions) {
  const sessionIdRef = useRef<string | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [viewerCount, setViewerCount] = useState<number | null>(null)

  useEffect(() => {
    sessionIdRef.current = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const sendHeartbeat = async () => {
      if (!sessionIdRef.current) return

      try {
        const response = await fetch('/api/viewers/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        })

        if (response.ok) {
          const data = await response.json()
          setViewerCount(data.viewerCount)
        }
      } catch (error) {
        if (isDev) console.log('[HLSPlayer] Heartbeat failed (non-fatal):', error)
      }
    }

    if (isPlaying && isActive) {
      sendHeartbeat()
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 20000)
    } else if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }
  }, [isPlaying, isActive])

  return { viewerCount }
}
