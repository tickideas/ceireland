import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    const { title, startDateTime, endDateTime } = await request.json()

    // Validate required fields
    if (!title || !startDateTime || !endDateTime) {
      return NextResponse.json({ error: 'title, startDateTime, and endDateTime are required' }, { status: 400 })
    }

    const start = new Date(startDateTime)
    const end = new Date(endDateTime)

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    if (end <= start) {
      return NextResponse.json({ error: 'endDateTime must be after startDateTime' }, { status: 400 })
    }

    const event = await prisma.streamEvent.create({
      data: {
        title,
        startDateTime: start,
        endDateTime: end
      }
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Create stream event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
