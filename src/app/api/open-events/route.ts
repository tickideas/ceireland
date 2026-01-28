import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/adminAuth'

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin(request)
    if (adminCheck instanceof NextResponse) {
      return adminCheck
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
    console.error('Get open events error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await verifyAdmin(request)
    if (adminCheck instanceof NextResponse) {
      return adminCheck
    }

    const { title, description, startDate, endDate, isActive, allowPublic } = await request.json()

    // Validation
    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: 'Title, start date, and end date are required' }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Check for overlapping events
    const overlappingEvents = await prisma.openEvent.findFirst({
      where: {
        startDate: { lte: end },
        endDate: { gte: start }
      }
    })

    if (overlappingEvents) {
      return NextResponse.json({ error: 'Event overlaps with existing open event' }, { status: 400 })
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
    console.error('Create open event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
