import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { userRoleSchema } from '@/lib/validation'
import { ValidationError, NotFoundError } from '@/lib/errors'

const idParams = z.object({ id: z.string().min(1, 'User ID is required') })

export const PATCH = adminRoute(
  { params: idParams, body: userRoleSchema },
  async ({ params: { id }, body: { role } }) => {
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      throw new NotFoundError('Member not found')
    }

    if (target.role === 'ADMIN' && role === 'USER') {
      const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', NOT: { id } } })
      if (otherAdmins === 0) {
        throw new ValidationError('Cannot demote the last admin')
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
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

    return { message: 'Role updated', user }
  }
)
