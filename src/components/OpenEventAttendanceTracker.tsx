'use client'

import { useState, useEffect, useCallback } from 'react'
import { useOpenEvent } from '@/hooks/useOpenEvent'

export default function AttendanceTracker() {
  const { hasActiveEvent, activeEvent } = useOpenEvent()
  const [recorded, setRecorded] = useState(false)

  const recordAttendance = useCallback(async () => {
    try {
      const storedSessionId = sessionStorage.getItem('openEventSessionId')
      const sessionId = storedSessionId || 
        `session_${crypto.randomUUID()}`
      
      sessionStorage.setItem('openEventSessionId', sessionId)

      const recordData = {
        openEventId: activeEvent?.id,
        sessionId,
        ipAddress: null, // Would be set by server
        userAgent: navigator.userAgent
      }

      const response = await fetch('/api/open-events/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recordData)
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Attendance recorded:', data)
        setRecorded(true)
      }
    } catch (error) {
      console.error('Failed to record attendance:', error)
    }
  }, [activeEvent])

  useEffect(() => {
    if (hasActiveEvent && activeEvent && !recorded) {
      recordAttendance()
    }
  }, [hasActiveEvent, activeEvent, recorded, recordAttendance])

  return null // This component doesn't render anything visible for users
}
