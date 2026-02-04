import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// PUT update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { title, startDateTime, endDateTime, isActive } = await request.json()

    const updateData: Record<string, unknown> = {}

    if (title !== undefined) updateData.title = title
    if (isActive !== undefined) updateData.isActive = isActive

    if (startDateTime) {
      const start = new Date(startDateTime)
      if (isNaN(start.getTime())) {
        return NextResponse.json({ error: 'Invalid startDateTime format' }, { status: 400 })
      }
      updateData.startDateTime = start
    }

    if (endDateTime) {
      const end = new Date(endDateTime)
      if (isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid endDateTime format' }, { status: 400 })
      }
      updateData.endDateTime = end
    }

    const event = await prisma.streamEvent.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Update stream event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await prisma.streamEvent.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Delete stream event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
