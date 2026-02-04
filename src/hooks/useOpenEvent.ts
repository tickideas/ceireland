import { useState, useEffect } from 'react'

interface OpenEvent {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  isActive: boolean
  allowPublic: boolean
}

export function useOpenEvent() {
  const [activeEvent, setActiveEvent] = useState<OpenEvent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkCurrentOpenEvent()
  }, [])

  const checkCurrentOpenEvent = async () => {
    try {
      const response = await fetch('/api/open-events/current')
      
      if (response.ok) {
        const data = await response.json()
        setActiveEvent(data.hasActiveEvent ? data.activeEvent : null)
      } else {
        setActiveEvent(null)
      }
    } catch (error) {
      console.error('Failed to check open event:', error)
      setActiveEvent(null)
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => checkCurrentOpenEvent()

  return {
    activeEvent,
    loading,
    refresh,
    hasActiveEvent: !!activeEvent && activeEvent.allowPublic
  }
}
