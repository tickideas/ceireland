import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { streamSettingsSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse } from '@/lib/errors'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

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

    // Get stream settings, schedules, and events in parallel
    const [streamSettings, schedules, events] = await Promise.all([
      prisma.streamSettings.findFirst(),
      prisma.streamSchedule.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }),
      prisma.streamEvent.findMany({ orderBy: { startDateTime: 'asc' } })
    ])

    return NextResponse.json({
      streamUrl: streamSettings?.streamUrl || '',
      posterUrl: streamSettings?.posterUrl || '',
      isActive: streamSettings?.isActive || false,
      scheduledEndTime: streamSettings?.scheduledEndTime || null,
      schedules,
      events
    })
  } catch (error) {
    console.error('Get stream settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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
    const validation = safeValidate(streamSettingsSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { streamUrl, posterUrl, isActive, scheduledEndTime } = validation.data

    // Parse scheduledEndTime if provided
    const endTime = scheduledEndTime ? new Date(scheduledEndTime) : null

    // Get existing settings or create new one
    let streamSettings = await prisma.streamSettings.findFirst()

    if (streamSettings) {
      // Update existing
      streamSettings = await prisma.streamSettings.update({
        where: { id: streamSettings.id },
        data: {
          streamUrl: streamUrl || null,
          posterUrl: posterUrl || null,
          isActive: isActive ?? false,
          scheduledEndTime: endTime
        }
      })
    } else {
      // Create new
      streamSettings = await prisma.streamSettings.create({
        data: {
          streamUrl: streamUrl || null,
          posterUrl: posterUrl || null,
          isActive: isActive ?? false,
          scheduledEndTime: endTime
        }
      })
    }

    return NextResponse.json({
      message: 'Stream settings updated successfully',
      streamUrl: streamSettings.streamUrl,
      posterUrl: streamSettings.posterUrl,
      isActive: streamSettings.isActive,
      scheduledEndTime: streamSettings.scheduledEndTime
    })
  } catch (error) {
    console.error('Update stream settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
