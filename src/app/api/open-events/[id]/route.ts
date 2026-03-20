import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { ValidationError, NotFoundError, errorToResponse, logError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }
    const { id } = await params

    const openEvent = await prisma.openEvent.findUnique({
      where: { id },
      include: {
        attendance: {
          select: {
            id: true,
            checkInTime: true,
            ipAddress: true,
            userAgent: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { checkInTime: 'desc' }
        }
      }
    })

    if (!openEvent) {
      const err = new NotFoundError('Open event not found')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    return NextResponse.json({ openEvent })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'OpenEventGet')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}

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
    const { title, description, startDate, endDate, isActive, allowPublic } = await request.json()

    const existingEvent = await prisma.openEvent.findUnique({ where: { id } })
    if (!existingEvent) {
      const err = new NotFoundError('Open event not found')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    let start = existingEvent.startDate
    let end = existingEvent.endDate

    if (startDate) {
      start = new Date(startDate)
    }
    if (endDate) {
      end = new Date(endDate)
    }

    if (start >= end) {
      const err = new ValidationError('End date must be after start date')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const overlappingEvents = await prisma.openEvent.findFirst({
      where: {
        id: { not: id },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start }
          }
        ]
      }
    })

    if (overlappingEvents) {
      const err = new ValidationError('Event overlaps with existing open event')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const updatedEvent = await prisma.openEvent.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingEvent.title,
        description: description !== undefined ? description : existingEvent.description,
        startDate: start,
        endDate: end,
        isActive: isActive !== undefined ? isActive : existingEvent.isActive,
        allowPublic: allowPublic !== undefined ? allowPublic : existingEvent.allowPublic
      },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        isActive: true,
        allowPublic: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      message: 'Open event updated successfully',
      openEvent: updatedEvent
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'OpenEventUpdate')
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

    const existingEvent = await prisma.openEvent.findUnique({ where: { id } })
    if (!existingEvent) {
      const err = new NotFoundError('Open event not found')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    await prisma.openEventAttendance.deleteMany({
      where: { openEventId: id }
    })

    await prisma.openEvent.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Open event deleted successfully'
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'OpenEventDelete')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
