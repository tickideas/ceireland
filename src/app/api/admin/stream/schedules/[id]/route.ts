import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { streamScheduleUpdateSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse } from '@/lib/errors'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

// PUT update schedule
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
    console.error('Update stream schedule error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE schedule
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

    await prisma.streamSchedule.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Schedule deleted successfully' })
  } catch (error) {
    console.error('Delete stream schedule error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
