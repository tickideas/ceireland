import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { streamScheduleSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse } from '@/lib/errors'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

// GET all schedules
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rateLimitResult = checkRateLimit(`admin:${payload.userId}`, RATE_LIMITS.ADMIN)
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: rateLimitResult.error || 'Too many requests' }, { status: 429 })
    }

    const schedules = await prisma.streamSchedule.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    })

    return NextResponse.json(schedules)
  } catch (error) {
    console.error('Get stream schedules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new schedule
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rateLimitResult = checkRateLimit(`admin:${payload.userId}`, RATE_LIMITS.ADMIN)
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: rateLimitResult.error || 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const validation = safeValidate(streamScheduleSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { dayOfWeek, startTime, endTime, label } = validation.data

    const schedule = await prisma.streamSchedule.create({
      data: {
        dayOfWeek,
        startTime,
        endTime,
        label: label || null
      }
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    console.error('Create stream schedule error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
