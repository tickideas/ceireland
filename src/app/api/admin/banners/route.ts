import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { bannerSchema } from '@/lib/validation'

export const GET = adminRoute({}, async () => {
  const banners = await prisma.banner.findMany({
    orderBy: { order: 'asc' }
  })
  return { banners }
})

export const POST = adminRoute({ body: bannerSchema }, async ({ body }) => {
  const { title, imageUrl, linkUrl, active, order } = body
  const banner = await prisma.banner.create({
    data: { title, imageUrl, linkUrl, active, order }
  })
  return { message: 'Banner created successfully', banner }
})
