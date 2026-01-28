import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    const schedules = await prisma.serviceSchedule.findMany({
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('Get service schedules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const {
      name,
      description,
      time,
      isActive = true,
      order = 0,
      recurrenceType = 'WEEKLY',
      dayOfWeek,
      dayOfMonth,
      specificDate,
      color = 'blue',
      icon = 'sun'
    } = await request.json()

    if (!name || !time) {
      return NextResponse.json({ error: 'Name and time are required' }, { status: 400 })
    }

    if (dayOfMonth !== undefined && (dayOfMonth < 1 || dayOfMonth > 31)) {
      return NextResponse.json({ error: 'Day of month must be between 1 and 31' }, { status: 400 })
    }

    const schedule = await prisma.serviceSchedule.create({
      data: {
        name,
        description,
        time,
        isActive,
        order,
        recurrenceType,
        dayOfWeek,
        dayOfMonth,
        specificDate: specificDate ? new Date(specificDate) : null,
        color,
        icon
      }
    })

    return NextResponse.json({
      message: 'Service schedule created successfully',
      schedule
    })
  } catch (error) {
    console.error('Create service schedule error:', error)
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

    const {
      id,
      name,
      description,
      time,
      isActive,
      order,
      recurrenceType,
      dayOfWeek,
      dayOfMonth,
      specificDate,
      color,
      icon
    } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    if (dayOfMonth !== undefined && dayOfMonth !== null && (dayOfMonth < 1 || dayOfMonth > 31)) {
      return NextResponse.json({ error: 'Day of month must be between 1 and 31' }, { status: 400 })
    }

    const existing = await prisma.serviceSchedule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Service schedule not found' }, { status: 404 })
    }

    const schedule = await prisma.serviceSchedule.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(time !== undefined && { time }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
        ...(recurrenceType !== undefined && { recurrenceType }),
        ...(dayOfWeek !== undefined && { dayOfWeek }),
        ...(dayOfMonth !== undefined && { dayOfMonth }),
        ...(specificDate !== undefined && { specificDate: specificDate ? new Date(specificDate) : null }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon })
      }
    })

    return NextResponse.json({
      message: 'Service schedule updated successfully',
      schedule
    })
  } catch (error) {
    console.error('Update service schedule error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    const existing = await prisma.serviceSchedule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Service schedule not found' }, { status: 404 })
    }

    await prisma.serviceSchedule.delete({ where: { id } })

    return NextResponse.json({ message: 'Service schedule deleted successfully' })
  } catch (error) {
    console.error('Delete service schedule error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
