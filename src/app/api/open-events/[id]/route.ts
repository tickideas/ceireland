import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/adminAuth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdmin(request)
    if (adminCheck instanceof NextResponse) {
      return adminCheck
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
      return NextResponse.json({ error: 'Open event not found' }, { status: 404 })
    }

    return NextResponse.json({ openEvent })
  } catch (error) {
    console.error('Get open event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdmin(request)
    if (adminCheck instanceof NextResponse) {
      return adminCheck
    }
    const { id } = await params
    const { title, description, startDate, endDate, isActive, allowPublic } = await request.json()

    const existingEvent = await prisma.openEvent.findUnique({ where: { id } })
    if (!existingEvent) {
      return NextResponse.json({ error: 'Open event not found' }, { status: 404 })
    }

    // Validation
    let start = existingEvent.startDate
    let end = existingEvent.endDate

    if (startDate) {
      start = new Date(startDate)
    }
    if (endDate) {
      end = new Date(endDate)
    }

    if (start >= end) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Check for overlapping events
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
      return NextResponse.json({ error: 'Event overlaps with existing open event' }, { status: 400 })
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
    console.error('Update open event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdmin(request)
    if (adminCheck instanceof NextResponse) {
      return adminCheck
    }
    const { id } = await params

    const existingEvent = await prisma.openEvent.findUnique({ where: { id } })
    if (!existingEvent) {
      return NextResponse.json({ error: 'Open event not found' }, { status: 404 })
    }

    // Delete related attendance records first
    await prisma.openEventAttendance.deleteMany({
      where: { openEventId: id }
    })

    // Delete the open event
    await prisma.openEvent.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Open event deleted successfully'
    })
  } catch (error) {
    console.error('Delete open event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
