import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { streamScheduleSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse, errorResponse } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const schedules = await prisma.streamSchedule.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    })

    return NextResponse.json(schedules)
  } catch (error) {
    return errorResponse(error, 'AdminStreamSchedulesList')
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const body = await request.json()
    const validation = safeValidate(streamScheduleSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { dayOfWeek, startTime, endTime, label } = validation.data

    const schedule = await prisma.streamSchedule.create({
      data: {
        dayOfWeek,
        startTime,
        endTime,
        label: label || null
      }
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'AdminStreamScheduleCreate')
  }
}
