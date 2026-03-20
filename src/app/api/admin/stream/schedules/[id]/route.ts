import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { streamScheduleUpdateSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse, logError } from '@/lib/errors'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const { id } = await params
    if (!id) {
      const err = new ValidationError('Schedule ID is required')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const body = await request.json()
    const validation = safeValidate(streamScheduleUpdateSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { dayOfWeek, startTime, endTime, label, isActive } = validation.data

    const schedule = await prisma.streamSchedule.update({
      where: { id },
      data: {
        ...(dayOfWeek !== undefined && { dayOfWeek }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(label !== undefined && { label: label || null }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json(schedule)
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminStreamScheduleUpdate')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const { id } = await params
    if (!id) {
      const err = new ValidationError('Schedule ID is required')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    await prisma.streamSchedule.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Schedule deleted successfully' })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminStreamScheduleDelete')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
