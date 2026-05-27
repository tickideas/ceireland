import { z } from 'zod'
import { adminRoute } from '@/lib/adminRoute'
import * as openEvents from '@/lib/openEvents'

const idParams = z.object({ id: z.string().min(1) })
const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
})

export const GET = adminRoute(
  { params: idParams, query: querySchema },
  async ({ params: { id }, query }) => {
    const page = query.page ? parseInt(query.page, 10) : undefined
    const limit = query.limit ? parseInt(query.limit, 10) : undefined
    return openEvents.daily(id, { page, limit })
  }
)
