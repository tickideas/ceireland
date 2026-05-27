import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { ValidationError, NotFoundError } from '@/lib/errors'

const idParams = z.object({ id: z.string().min(1) })

export const GET = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  const openEvent = await prisma.openEvent.findUnique({
    where: { id },
    include: {
      attendance: {
        select: {
          id: true,
          checkInTime: true,
          ipAddress: true,
          userAgent: true,
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { checkInTime: 'desc' }
      }
    }
  })

  if (!openEvent) {
    throw new NotFoundError('Open event not found')
  }

  return { openEvent }
})

const updateBody = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
  allowPublic: z.boolean().optional(),
})

export const PUT = adminRoute(
  { params: idParams, body: updateBody },
  async ({ params: { id }, body }) => {
    const { title, description, startDate, endDate, isActive, allowPublic } = body

    const existingEvent = await prisma.openEvent.findUnique({ where: { id } })
    if (!existingEvent) {
      throw new NotFoundError('Open event not found')
    }

    let start = existingEvent.startDate
    let end = existingEvent.endDate

    if (startDate) start = new Date(startDate)
    if (endDate) end = new Date(endDate)

    if (start >= end) {
      throw new ValidationError('End date must be after start date')
    }

    const overlappingEvents = await prisma.openEvent.findFirst({
      where: {
        id: { not: id },
        OR: [{ startDate: { lte: end }, endDate: { gte: start } }]
      }
    })

    if (overlappingEvents) {
      throw new ValidationError('Event overlaps with existing open event')
    }

    const updatedEvent = await prisma.openEvent.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingEvent.title,
        description: description !== undefined ? description : existingEvent.description,
        startDate: start,
        endDate: end,
        isActive: isActive !== undefined ? isActive : existingEvent.isActive,
        allowPublic: allowPublic !== undefined ? allowPublic : existingEvent.allowPublic
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

    return { message: 'Open event updated successfully', openEvent: updatedEvent }
  }
)

export const DELETE = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  const existingEvent = await prisma.openEvent.findUnique({ where: { id } })
  if (!existingEvent) {
    throw new NotFoundError('Open event not found')
  }

  await prisma.openEventAttendance.deleteMany({ where: { openEventId: id } })
  await prisma.openEvent.delete({ where: { id } })

  return { message: 'Open event deleted successfully' }
})
