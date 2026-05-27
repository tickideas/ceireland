import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { updateUserSchema } from '@/lib/validation'
import { ValidationError, ConflictError, NotFoundError } from '@/lib/errors'

const idParams = z.object({ id: z.string().min(1, 'User ID is required') })

export const PATCH = adminRoute(
  { params: idParams, body: updateUserSchema },
  async ({ params: { id }, body }) => {
    const data = Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== undefined)
    )

    if (Object.keys(data).length === 0) {
      throw new ValidationError('No fields to update')
    }

    if (typeof data.email === 'string') {
      const exists = await prisma.user.findFirst({ where: { email: data.email, NOT: { id } } })
      if (exists) {
        throw new ConflictError('Email already in use')
      }
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          title: true,
          name: true,
          lastName: true,
          email: true,
          phone: true,
          approved: true,
          role: true,
          createdAt: true
        }
      })
      return { message: 'Member updated', user }
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Member not found')
      }
      throw error
    }
  }
)

export const DELETE = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    throw new NotFoundError('Member not found')
  }

  if (user.role === 'ADMIN') {
    const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', NOT: { id } } })
    if (otherAdmins === 0) {
      throw new ValidationError('Cannot delete the last admin user')
    }
  }

  await prisma.user.delete({ where: { id } })
  return { message: 'User deleted' }
})
