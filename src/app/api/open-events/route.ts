import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { ValidationError, errorToResponse, logError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const { searchParams } = request.nextUrl
    const isActive = searchParams.get('active')

    let where = {}

    if (isActive === 'true') {
      const now = new Date()
      where = {
        isActive: true,
        allowPublic: true,
        startDate: { lte: now },
        endDate: { gte: now }
      }
    }

    const openEvents = await prisma.openEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json({ openEvents })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'OpenEventsList')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const { title, description, startDate, endDate, isActive, allowPublic } = await request.json()

    if (!title || !startDate || !endDate) {
      const err = new ValidationError('Title, start date, and end date are required')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      const err = new ValidationError('End date must be after start date')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const overlappingEvents = await prisma.openEvent.findFirst({
      where: {
        startDate: { lte: end },
        endDate: { gte: start }
      }
    })

    if (overlappingEvents) {
      const err = new ValidationError('Event overlaps with existing open event')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const openEvent = await prisma.openEvent.create({
      data: {
        title,
        description,
        startDate: start,
        endDate: end,
        isActive: isActive !== undefined ? isActive : true,
        allowPublic: allowPublic !== undefined ? allowPublic : true
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
      message: 'Open event created successfully',
      openEvent
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'OpenEventCreate')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
