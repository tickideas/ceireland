import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { NotFoundError, errorToResponse, errorResponse } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const resolvedParams = await params
    const { id } = resolvedParams

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
      const err = new NotFoundError('Open event not found')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

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
    return errorResponse(error, 'OpenEventAttendanceDaily')
  }
}
