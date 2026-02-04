import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { streamEventUpdateSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse } from '@/lib/errors'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

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

    const rateLimitResult = checkRateLimit(`admin:${payload.userId}`, RATE_LIMITS.ADMIN)
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: rateLimitResult.error || 'Too many requests' }, { status: 429 })
    }

    const { id } = await params
    const body = await request.json()
    const validation = safeValidate(streamEventUpdateSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { title, startDateTime, endDateTime, isActive } = validation.data

    const updateData: Record<string, unknown> = {}

    if (title !== undefined) updateData.title = title
    if (isActive !== undefined) updateData.isActive = isActive

    if (startDateTime !== undefined) {
      updateData.startDateTime = new Date(startDateTime)
    }

    if (endDateTime !== undefined) {
      updateData.endDateTime = new Date(endDateTime)
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

    const rateLimitResult = checkRateLimit(`admin:${payload.userId}`, RATE_LIMITS.ADMIN)
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: rateLimitResult.error || 'Too many requests' }, { status: 429 })
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
