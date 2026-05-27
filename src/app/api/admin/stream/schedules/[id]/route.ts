import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { streamScheduleUpdateSchema } from '@/lib/validation'

const idParams = z.object({ id: z.string().min(1, 'Schedule ID is required') })

export const PUT = adminRoute(
  { params: idParams, body: streamScheduleUpdateSchema },
  async ({ params: { id }, body }) => {
    const { dayOfWeek, startTime, endTime, label, isActive } = body
    return prisma.streamSchedule.update({
      where: { id },
      data: {
        ...(dayOfWeek !== undefined && { dayOfWeek }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(label !== undefined && { label: label || null }),
        ...(isActive !== undefined && { isActive })
      }
    })
  }
)

export const DELETE = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  await prisma.streamSchedule.delete({ where: { id } })
  return { message: 'Schedule deleted successfully' }
})
