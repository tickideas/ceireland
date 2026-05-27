import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { NotFoundError } from '@/lib/errors'
import { streamScheduleUpdateSchema } from '@/lib/validation'

const idParams = z.object({ id: z.string().min(1, 'Schedule ID is required') })

export const PUT = adminRoute(
  { params: idParams, body: streamScheduleUpdateSchema },
  async ({ params: { id }, body }) => {
    const { dayOfWeek, startTime, endTime, label, isActive } = body
    try {
      return await prisma.streamSchedule.update({
        where: { id },
        data: {
          ...(dayOfWeek !== undefined && { dayOfWeek }),
          ...(startTime !== undefined && { startTime }),
          ...(endTime !== undefined && { endTime }),
          ...(label !== undefined && { label: label || null }),
          ...(isActive !== undefined && { isActive })
        }
      })
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Schedule not found')
      }
      throw error
    }
  }
)

export const DELETE = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  try {
    await prisma.streamSchedule.delete({ where: { id } })
    return { message: 'Schedule deleted successfully' }
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      throw new NotFoundError('Schedule not found')
    }
    throw error
  }
})
