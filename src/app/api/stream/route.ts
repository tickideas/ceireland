import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CACHE_TTL_MS = 10_000
let streamCache: { data: unknown; expiresAt: number } | null = null

// Helper to check if current time falls within a schedule
function isWithinSchedule(schedule: { dayOfWeek: number; startTime: string; endTime: string }): boolean {
  const now = new Date()
  const currentDay = now.getDay() // 0 = Sunday
  
  if (schedule.dayOfWeek !== currentDay) return false
  
  const currentTime = now.toTimeString().slice(0, 5) // "HH:mm"
  return currentTime >= schedule.startTime && currentTime <= schedule.endTime
}

// Helper to check if current time falls within an event
function isWithinEvent(event: { startDateTime: Date; endDateTime: Date }): boolean {
  const now = new Date()
  return now >= event.startDateTime && now <= event.endDateTime
}

// Helper to find next scheduled time
function getNextScheduledTime(
  schedules: Array<{ dayOfWeek: number; startTime: string; label: string | null }>,
  events: Array<{ title: string; startDateTime: Date }>
): { time: Date; label: string } | null {
  const now = new Date()
  const candidates: Array<{ time: Date; label: string }> = []

  // Check upcoming events
  for (const event of events) {
    if (event.startDateTime > now) {
      candidates.push({ time: event.startDateTime, label: event.title })
    }
  }

  // Check recurring schedules (next 7 days)
  for (const schedule of schedules) {
    const [hours, minutes] = schedule.startTime.split(':').map(Number)
    
    // Calculate days until next occurrence
    let daysUntil = schedule.dayOfWeek - now.getDay()
    if (daysUntil < 0) daysUntil += 7
    if (daysUntil === 0) {
      // Same day - check if time has passed
      const scheduleTime = new Date(now)
      scheduleTime.setHours(hours, minutes, 0, 0)
      if (scheduleTime <= now) {
        daysUntil = 7 // Next week
      }
    }

    const nextOccurrence = new Date(now)
    nextOccurrence.setDate(now.getDate() + daysUntil)
    nextOccurrence.setHours(hours, minutes, 0, 0)

    candidates.push({ 
      time: nextOccurrence, 
      label: schedule.label || getDayName(schedule.dayOfWeek) + ' Service'
    })
  }

  // Return the earliest
  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.time.getTime() - b.time.getTime())
  return candidates[0]
}

function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[day]
}

export async function GET(_request: NextRequest) {
  try {
    if (streamCache && streamCache.expiresAt > Date.now()) {
      return NextResponse.json(streamCache.data)
    }

    // Get stream settings, schedules, and events in parallel
    const [streamSettings, schedules, events] = await Promise.all([
      prisma.streamSettings.findFirst(),
      prisma.streamSchedule.findMany({ where: { isActive: true } }),
      prisma.streamEvent.findMany({ where: { isActive: true } })
    ])

    if (!streamSettings) {
      const data = {
        streamUrl: '',
        posterUrl: '',
        isActive: false,
        activeSource: 'none',
        activeLabel: null,
        nextScheduled: null
      }
      streamCache = { data, expiresAt: Date.now() + CACHE_TTL_MS }
      return NextResponse.json(data)
    }

    let isActive = false
    let activeSource: 'manual' | 'event' | 'schedule' | 'none' = 'none'
    let activeLabel: string | null = null

    // Priority 1: Manual override (StreamSettings.isActive = true)
    if (streamSettings.isActive) {
      isActive = true
      activeSource = 'manual'
      activeLabel = 'Manual Override'
    }
    
    // Priority 2: Check one-off events (only if not manually active)
    if (!isActive) {
      for (const event of events) {
        if (isWithinEvent(event)) {
          isActive = true
          activeSource = 'event'
          activeLabel = event.title
          break
        }
      }
    }

    // Priority 3: Check recurring schedules (only if not already active)
    if (!isActive) {
      for (const schedule of schedules) {
        if (isWithinSchedule(schedule)) {
          isActive = true
          activeSource = 'schedule'
          activeLabel = schedule.label || getDayName(schedule.dayOfWeek) + ' Service'
          break
        }
      }
    }

    // Calculate next scheduled time if not active
    let nextScheduled: string | null = null
    if (!isActive) {
      const next = getNextScheduledTime(schedules, events)
      if (next) {
        nextScheduled = next.time.toISOString()
      }
    }

    const data = {
      streamUrl: streamSettings.streamUrl || '',
      posterUrl: streamSettings.posterUrl || '',
      isActive,
      activeSource,
      activeLabel,
      nextScheduled
    }

    streamCache = { data, expiresAt: Date.now() + CACHE_TTL_MS }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Get stream settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
