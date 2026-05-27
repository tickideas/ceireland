import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'

const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  showFollowedUp: z.string().optional(),
})

export const GET = adminRoute({ query: querySchema }, async ({ query }) => {
  const page = Math.max(1, parseInt(query.page || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)))
  const skip = (page - 1) * limit
  const showFollowedUp = query.showFollowedUp === 'true'

  const where = showFollowedUp ? {} : { followedUp: false }

  const [responses, total, pendingCount] = await Promise.all([
    prisma.salvationResponse.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.salvationResponse.count({ where }),
    prisma.salvationResponse.count({
      where: { followedUp: false }
    })
  ])

  return {
    responses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    pendingCount
  }
})
