import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { NotFoundError } from '@/lib/errors'

const idParams = z.object({ id: z.string().min(1) })
const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
})

export const GET = adminRoute(
  { params: idParams, query: querySchema },
  async ({ params: { id }, query }) => {
    const openEvent = await prisma.openEvent.findUnique({
      where: { id },
      select: { id: true, title: true, startDate: true, endDate: true }
    })

    if (!openEvent) {
      throw new NotFoundError('Open event not found')
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

    const page = parseInt(query.page || '1', 10)
    const limit = Math.min(parseInt(query.limit || '100', 10), 500)
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
          select: { id: true, title: true, name: true, lastName: true, email: true }
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

    return {
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
    }
  }
)
