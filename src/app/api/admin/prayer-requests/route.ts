import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'

const querySchema = z.object({
  includeArchived: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

export const GET = adminRoute({ query: querySchema }, async ({ query }) => {
  const includeArchived = query.includeArchived === 'true'
  const page = Math.max(1, parseInt(query.page || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)))
  const skip = (page - 1) * limit

  const where = includeArchived ? {} : { isArchived: false }

  const [requests, total, unreadCount] = await Promise.all([
    prisma.prayerRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.prayerRequest.count({ where }),
    prisma.prayerRequest.count({
      where: { isRead: false, isArchived: false }
    })
  ])

  return {
    requests,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    unreadCount
  }
})
