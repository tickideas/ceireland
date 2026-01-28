import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    
    const activeOpenEvent = await prisma.openEvent.findFirst({
      where: {
        isActive: true,
        allowPublic: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        isActive: true,
        allowPublic: true
      }
    })

    return NextResponse.json({ 
      hasActiveEvent: !!activeOpenEvent,
      activeEvent: activeOpenEvent
    })
  } catch (error) {
    console.error('Check open event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
