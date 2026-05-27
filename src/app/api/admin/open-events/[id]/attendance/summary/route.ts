import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { NotFoundError } from '@/lib/errors'

const idParams = z.object({ id: z.string().min(1) })

export const GET = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  const openEvent = await prisma.openEvent.findUnique({
    where: { id },
    select: { id: true, title: true, startDate: true, endDate: true }
  })

  if (!openEvent) {
    throw new NotFoundError('Open event not found')
  }

  const [totalResult, guestResult, memberResult] = await Promise.all([
    prisma.openEventAttendance.count({ where: { openEventId: id } }),
    prisma.openEventAttendance.count({ where: { openEventId: id, userId: null } }),
    prisma.openEventAttendance.count({ where: { openEventId: id, userId: { not: null } } })
  ])

  const uniqueDays = await prisma.$queryRaw<{ date: string }[]>`
    SELECT DISTINCT DATE("checkInTime") as date
    FROM "OpenEventAttendance"
    WHERE "openEventId" = ${id}
    ORDER BY date
  `

  return {
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
  }
})
