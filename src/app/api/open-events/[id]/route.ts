import { z } from 'zod'
import { adminRoute } from '@/lib/adminRoute'
import * as openEvents from '@/lib/openEvents'

const idParams = z.object({ id: z.string().min(1) })

export const GET = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  const openEvent = await openEvents.getByIdWithAttendance(id)
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
    const openEvent = await openEvents.update(id, {
      title: body.title,
      description: body.description,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      isActive: body.isActive,
      allowPublic: body.allowPublic,
    })
    return { message: 'Open event updated successfully', openEvent }
  }
)

export const DELETE = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  await openEvents.remove(id)
  return { message: 'Open event deleted successfully' }
})
