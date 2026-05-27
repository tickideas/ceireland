'use client'

import { useCallback, useEffect, useRef } from 'react'

const isDev = process.env.NODE_ENV !== 'production'

interface UseRetryLoopOptions {
  onRetry: () => void | Promise<void>
  intervalMs?: number
  logPrefix?: string
}

export function useRetryLoop({
  onRetry,
  intervalMs = 30000,
  logPrefix = '[HLSPlayer]',
}: UseRetryLoopOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef(0)
  const onRetryRef = useRef(onRetry)

  useEffect(() => {
    onRetryRef.current = onRetry
  }, [onRetry])

  const stopRetryLoop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    retryCountRef.current = 0
  }, [])

  const startRetryLoop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    retryCountRef.current = 0
    intervalRef.current = setInterval(() => {
      retryCountRef.current += 1
      if (isDev) console.log(`${logPrefix} Retry attempt ${retryCountRef.current}`)
      void onRetryRef.current()
    }, intervalMs)
  }, [intervalMs, logPrefix])

  useEffect(() => {
    return () => {
      stopRetryLoop()
    }
  }, [stopRetryLoop])

  return { startRetryLoop, stopRetryLoop }
}
