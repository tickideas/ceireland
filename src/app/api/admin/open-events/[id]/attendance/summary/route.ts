import { z } from 'zod'
import { adminRoute } from '@/lib/adminRoute'
import * as openEvents from '@/lib/openEvents'

const idParams = z.object({ id: z.string().min(1) })

export const GET = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  const result = await openEvents.summary(id)
  return {
    event: result.event,
    summary: {
      totalAttendance: result.totalAttendance,
      guestCount: result.guestCount,
      memberCount: result.memberCount,
      uniqueDays: result.uniqueDays,
      days: result.days,
    },
  }
})
