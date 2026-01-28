import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

function serviceTitleFor(date: Date) {
  const day = date.getDay()
  return `${DAY_NAMES[day]} Service`
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)
    const title = serviceTitleFor(now)

    // Find or create the service for today (SQLite lacks case-insensitive filter)
    let service = await prisma.service.findFirst({
      where: { date: { gte: dayStart, lte: dayEnd } },
      orderBy: { date: 'asc' }
    })

    if (!service) {
      service = await prisma.service.create({
        data: {
          title,
          description: undefined,
          date: now,
          hlsUrl: null,
          isActive: true
        }
      })
    }

    // Upsert attendance (unique on userId+serviceId prevents duplicates)
    const existing = await prisma.attendance.findFirst({
      where: { userId: payload.userId, serviceId: service.id }
    })

    if (!existing) {
      await prisma.attendance.create({
        data: {
          userId: payload.userId,
          serviceId: service.id,
          // checkInTime defaults to now()
        }
      })
    }

    return NextResponse.json({ ok: true, serviceId: service.id })
  } catch (error) {
    console.error('Attendance check-in error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
