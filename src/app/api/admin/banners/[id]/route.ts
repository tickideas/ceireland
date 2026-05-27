import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { updateBannerSchema } from '@/lib/validation'

const idParams = z.object({ id: z.string().min(1, 'Banner ID is required') })

export const PATCH = adminRoute(
  { params: idParams, body: updateBannerSchema },
  async ({ params: { id }, body }) => {
    const banner = await prisma.banner.update({ where: { id }, data: body })
    return { message: 'Banner updated successfully', banner }
  }
)

export const DELETE = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  await prisma.banner.delete({ where: { id } })
  return { message: 'Banner deleted successfully' }
})
