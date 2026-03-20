import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { streamEventSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse, logError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const events = await prisma.streamEvent.findMany({
      orderBy: { startDateTime: 'asc' }
    })

    return NextResponse.json(events)
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminStreamEventsList')
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
    const validation = safeValidate(streamEventSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { title, startDateTime, endDateTime } = validation.data

    const event = await prisma.streamEvent.create({
      data: {
        title,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime)
      }
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminStreamEventCreate')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
