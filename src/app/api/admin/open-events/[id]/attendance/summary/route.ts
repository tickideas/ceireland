import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/adminAuth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await verifyAdmin(request)
    if (adminCheck instanceof NextResponse) {
      return adminCheck
    }

    const resolvedParams = await params
    const { id } = resolvedParams

    // Verify event exists
    const openEvent = await prisma.openEvent.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true
      }
    })

    if (!openEvent) {
      return NextResponse.json({ error: 'Open event not found' }, { status: 404 })
    }

    // Use DB aggregation for counts
    const [totalResult, guestResult, memberResult] = await Promise.all([
      prisma.openEventAttendance.count({
        where: { openEventId: id }
      }),
      prisma.openEventAttendance.count({
        where: { openEventId: id, userId: null }
      }),
      prisma.openEventAttendance.count({
        where: { openEventId: id, userId: { not: null } }
      })
    ])

    // Get unique days using raw query for efficiency
    const uniqueDays = await prisma.$queryRaw<{ date: string }[]>`
      SELECT DISTINCT DATE(\"checkInTime\") as date
      FROM "OpenEventAttendance"
      WHERE "openEventId" = ${id}
      ORDER BY date
    `

    return NextResponse.json({
      event: {
        id: openEvent.id,
        title: openEvent.title,
        startDate: openEvent.startDate,
        endDate: openEvent.endDate
      },
      summary: {
        totalAttendance: totalResult,
        guestCount: guestResult,
        memberCount: memberResult,
        uniqueDays: uniqueDays.length,
        days: uniqueDays.map(d => d.date)
      }
    })
  } catch (error) {
    console.error('Get open event attendance summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
