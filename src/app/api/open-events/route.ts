import { z } from 'zod'
import { adminRoute } from '@/lib/adminRoute'
import * as openEvents from '@/lib/openEvents'

const listQuery = z.object({
  active: z.string().optional(),
})

export const GET = adminRoute({ query: listQuery }, async ({ query }) => {
  const list = query.active === 'true' ? await openEvents.listLive() : await openEvents.list()
  return { openEvents: list }
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
  const openEvent = await openEvents.create({
    title: body.title,
    description: body.description,
    startDate: new Date(body.startDate),
    endDate: new Date(body.endDate),
    isActive: body.isActive,
    allowPublic: body.allowPublic,
  })
  return { message: 'Open event created successfully', openEvent }
})
