import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { streamSettingsSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse, errorResponse } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

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
    return errorResponse(error, 'AdminStreamGet')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const body = await request.json()
    const validation = safeValidate(streamSettingsSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { streamUrl, posterUrl, isActive, scheduledEndTime } = validation.data
    const endTime = scheduledEndTime ? new Date(scheduledEndTime) : null

    let streamSettings = await prisma.streamSettings.findFirst()

    if (streamSettings) {
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
    return errorResponse(error, 'AdminStreamUpdate')
  }
}
