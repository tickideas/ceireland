import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { NotFoundError } from '@/lib/errors'

const idParams = z.object({ id: z.string().min(1, 'Salvation response ID is required') })

const updateSchema = z.object({
  followedUp: z.boolean().optional(),
  followUpNotes: z.string().nullable().optional(),
})

export const PATCH = adminRoute(
  { params: idParams, body: updateSchema },
  async ({ params: { id }, body }) => {
    try {
      return await prisma.salvationResponse.update({
        where: { id },
        data: {
          followedUp: body.followedUp,
          followUpNotes: body.followUpNotes
        }
      })
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Salvation response not found')
      }
      throw error
    }
  }
)

export const DELETE = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  try {
    await prisma.salvationResponse.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      throw new NotFoundError('Salvation response not found')
    }
    throw error
  }
})
