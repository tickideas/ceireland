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

    const uniqueDays = await prisma.$queryRaw<{ date: string }[]>`
      SELECT DISTINCT DATE("checkInTime") as date
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
        days: uniqueDays.map((d: { date: string }) => d.date)
      }
    })
  } catch (error) {
    return errorResponse(error, 'OpenEventAttendanceSummary')
  }
}
