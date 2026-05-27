import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { NotFoundError } from '@/lib/errors'

const idParams = z.object({ id: z.string().min(1, 'Prayer request ID is required') })

const updateSchema = z.object({
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  notes: z.string().nullable().optional(),
})

export const PATCH = adminRoute(
  { params: idParams, body: updateSchema },
  async ({ params: { id }, body }) => {
    try {
      return await prisma.prayerRequest.update({
        where: { id },
        data: {
          isRead: body.isRead,
          isArchived: body.isArchived,
          notes: body.notes
        }
      })
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Prayer request not found')
      }
      throw error
    }
  }
)

export const DELETE = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  try {
    await prisma.prayerRequest.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      throw new NotFoundError('Prayer request not found')
    }
    throw error
  }
})
