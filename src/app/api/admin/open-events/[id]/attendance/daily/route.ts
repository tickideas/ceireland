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

    // Use DB aggregation for daily breakdown
    const dailyStats = await prisma.$queryRaw<
      { date: string; total: bigint; guests: bigint; members: bigint }[]
    >`
      SELECT 
        DATE("checkInTime") as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE "userId" IS NULL) as guests,
        COUNT(*) FILTER (WHERE "userId" IS NOT NULL) as members
      FROM "OpenEventAttendance"
      WHERE "openEventId" = ${id}
      GROUP BY DATE("checkInTime")
      ORDER BY date
    `

    // For detailed records, use pagination
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)
    const skip = (page - 1) * limit

    const records = await prisma.openEventAttendance.findMany({
      where: { openEventId: id },
      select: {
        id: true,
        sessionId: true,
        userId: true,
        checkInTime: true,
        ipAddress: true,
        userAgent: true,
        user: {
          select: {
            id: true,
            title: true,
            name: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { checkInTime: 'desc' },
      skip,
      take: limit
    })

    // Convert bigint to number for JSON serialization
    const dailyBreakdown = dailyStats.map((day: typeof dailyStats[number]) => ({
      date: day.date,
      total: Number(day.total),
      guests: Number(day.guests),
      members: Number(day.members)
    }))

    return NextResponse.json({
      event: {
        id: openEvent.id,
        title: openEvent.title,
        startDate: openEvent.startDate,
        endDate: openEvent.endDate
      },
      dailyBreakdown,
      records,
      pagination: {
        page,
        limit,
        hasMore: records.length === limit
      }
    })
  } catch (error) {
    console.error('Get open event daily attendance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
