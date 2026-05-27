import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { NotFoundError } from '@/lib/errors'
import { streamEventUpdateSchema } from '@/lib/validation'

const idParams = z.object({ id: z.string().min(1, 'Event ID is required') })

export const PUT = adminRoute(
  { params: idParams, body: streamEventUpdateSchema },
  async ({ params: { id }, body }) => {
    const { title, startDateTime, endDateTime, isActive } = body
    const updateData: Record<string, unknown> = {}

    if (title !== undefined) updateData.title = title
    if (isActive !== undefined) updateData.isActive = isActive
    if (startDateTime !== undefined) updateData.startDateTime = new Date(startDateTime)
    if (endDateTime !== undefined) updateData.endDateTime = new Date(endDateTime)

    try {
      return await prisma.streamEvent.update({ where: { id }, data: updateData })
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Event not found')
      }
      throw error
    }
  }
)

export const DELETE = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  try {
    await prisma.streamEvent.delete({ where: { id } })
    return { message: 'Event deleted successfully' }
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      throw new NotFoundError('Event not found')
    }
    throw error
  }
})
