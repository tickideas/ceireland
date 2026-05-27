import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { serviceScheduleManageSchema, serviceScheduleUpdateSchema } from '@/lib/validation'
import { NotFoundError } from '@/lib/errors'

export const GET = adminRoute({}, async () => {
  const schedules = await prisma.serviceSchedule.findMany({ orderBy: { order: 'asc' } })
  return { schedules }
})

export const POST = adminRoute({ body: serviceScheduleManageSchema }, async ({ body }) => {
  const {
    name,
    description,
    time,
    isActive = true,
    order = 0,
    recurrenceType = 'WEEKLY',
    dayOfWeek,
    dayOfMonth,
    specificDate,
    color = 'blue',
    icon = 'sun'
  } = body

  const schedule = await prisma.serviceSchedule.create({
    data: {
      name,
      description,
      time,
      isActive,
      order,
      recurrenceType,
      dayOfWeek,
      dayOfMonth,
      specificDate: specificDate ? new Date(specificDate) : null,
      color,
      icon
    }
  })

  return { message: 'Service schedule created successfully', schedule }
})

export const PUT = adminRoute({ body: serviceScheduleUpdateSchema }, async ({ body }) => {
  const {
    id,
    name,
    description,
    time,
    isActive,
    order,
    recurrenceType,
    dayOfWeek,
    dayOfMonth,
    specificDate,
    color,
    icon
  } = body

  const existing = await prisma.serviceSchedule.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Service schedule not found')
  }

  const schedule = await prisma.serviceSchedule.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(time !== undefined && { time }),
      ...(isActive !== undefined && { isActive }),
      ...(order !== undefined && { order }),
      ...(recurrenceType !== undefined && { recurrenceType }),
      ...(dayOfWeek !== undefined && { dayOfWeek }),
      ...(dayOfMonth !== undefined && { dayOfMonth }),
      ...(specificDate !== undefined && { specificDate: specificDate ? new Date(specificDate) : null }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon })
    }
  })

  return { message: 'Service schedule updated successfully', schedule }
})

const deleteQuery = z.object({ id: z.string().min(1, 'Schedule ID is required') })

export const DELETE = adminRoute({ query: deleteQuery }, async ({ query: { id } }) => {
  const existing = await prisma.serviceSchedule.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Service schedule not found')
  }
  await prisma.serviceSchedule.delete({ where: { id } })
  return { message: 'Service schedule deleted successfully' }
})
