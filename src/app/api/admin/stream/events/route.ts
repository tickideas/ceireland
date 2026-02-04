import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { streamEventSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse } from '@/lib/errors'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

// GET all events
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

    // Get all events, ordered by start date
    const events = await prisma.streamEvent.findMany({
      orderBy: { startDateTime: 'asc' }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Get stream events error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new event
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
    const validation = safeValidate(streamEventSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { title, startDateTime, endDateTime } = validation.data

    const event = await prisma.streamEvent.create({
      data: {
        title,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime)
      }
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Create stream event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
