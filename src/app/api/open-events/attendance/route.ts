import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { openEventId, sessionId, ipAddress, userAgent } = await request.json()
    const authToken = request.cookies.get('auth-token')

    // Validation
    if (!openEventId) {
      return NextResponse.json({ error: 'Open event ID is required' }, { status: 400 })
    }

    // Find the open event
    const openEvent = await prisma.openEvent.findUnique({
      where: { id: openEventId }
    })

    if (!openEvent) {
      return NextResponse.json({ error: 'Open event not found' }, { status: 404 })
    }

    const now = new Date()
    let userId: string | null = null

    // Verify JWT if token exists
    if (authToken) {
      const payload = verifyToken(authToken.value)
      if (payload) {
        userId = payload.userId
      }
    }

    // Check if the event is currently active
    if (openEvent.startDate > now || openEvent.endDate < now) {
      // Only allow out-of-window check-ins for verified authenticated users
      if (!userId) {
        return NextResponse.json({ error: 'Event is not currently active' }, { status: 400 })
      }
    }

    // Check if attendance record already exists
    let existingAttendance = null

    if (userId) {
      existingAttendance = await prisma.openEventAttendance.findFirst({
        where: {
          openEventId,
          userId
        }
      })
    } else if (sessionId) {
      existingAttendance = await prisma.openEventAttendance.findFirst({
        where: {
          openEventId,
          sessionId
        }
      })
    }

    if (!existingAttendance) {
      // Create new attendance record
      const attendance = await prisma.openEventAttendance.create({
        data: {
          openEventId,
          sessionId: sessionId || null,
          userId: userId || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      return NextResponse.json({ 
        message: 'Attendance recorded successfully',
        attendance
      })
    } else {
      return NextResponse.json({ 
        message: 'Attendance already recorded',
        attendance: existingAttendance
      })
    }
  } catch (error) {
    console.error('Record open event attendance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
