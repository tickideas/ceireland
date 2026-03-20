import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { serviceScheduleManageSchema, serviceScheduleUpdateSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, NotFoundError, errorToResponse, logError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const schedules = await prisma.serviceSchedule.findMany({
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminServiceSchedulesList')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const body = await request.json()
    const validation = safeValidate(serviceScheduleManageSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
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
    } = validation.data

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
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminServiceScheduleCreate')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const body = await request.json()
    const validation = safeValidate(serviceScheduleUpdateSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
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
    } = validation.data

    const existing = await prisma.serviceSchedule.findUnique({ where: { id } })
    if (!existing) {
      const err = new NotFoundError('Service schedule not found')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
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
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminServiceScheduleUpdate')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      const err = new ValidationError('Schedule ID is required')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const existing = await prisma.serviceSchedule.findUnique({ where: { id } })
    if (!existing) {
      const err = new NotFoundError('Service schedule not found')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    await prisma.serviceSchedule.delete({ where: { id } })

    return NextResponse.json({ message: 'Service schedule deleted successfully' })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminServiceScheduleDelete')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
