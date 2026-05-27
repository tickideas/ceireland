import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { ValidationError } from '@/lib/errors'

const listQuery = z.object({
  active: z.string().optional(),
})

export const GET = adminRoute({ query: listQuery }, async ({ query }) => {
  let where = {}

  if (query.active === 'true') {
    const now = new Date()
    where = {
      isActive: true,
      allowPublic: true,
      startDate: { lte: now },
      endDate: { gte: now }
    }
  }

  const openEvents = await prisma.openEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      isActive: true,
      allowPublic: true,
      createdAt: true,
      updatedAt: true
    }
  })

  return { openEvents }
})

const createBody = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isActive: z.boolean().optional(),
  allowPublic: z.boolean().optional(),
})

export const POST = adminRoute({ body: createBody }, async ({ body }) => {
  const { title, description, startDate, endDate, isActive, allowPublic } = body

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (start >= end) {
    throw new ValidationError('End date must be after start date')
  }

  const overlappingEvents = await prisma.openEvent.findFirst({
    where: {
      startDate: { lte: end },
      endDate: { gte: start }
    }
  })

  if (overlappingEvents) {
    throw new ValidationError('Event overlaps with existing open event')
  }

  const openEvent = await prisma.openEvent.create({
    data: {
      title,
      description,
      startDate: start,
      endDate: end,
      isActive: isActive !== undefined ? isActive : true,
      allowPublic: allowPublic !== undefined ? allowPublic : true
    },
    select: {
      id: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      isActive: true,
      allowPublic: true,
      createdAt: true,
      updatedAt: true
    }
  })

  return { message: 'Open event created successfully', openEvent }
})
