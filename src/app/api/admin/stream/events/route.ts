import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { streamEventSchema } from '@/lib/validation'

export const GET = adminRoute({}, async () => {
  return prisma.streamEvent.findMany({ orderBy: { startDateTime: 'asc' } })
})

export const POST = adminRoute({ body: streamEventSchema }, async ({ body }) => {
  const { title, startDateTime, endDateTime } = body
  const event = await prisma.streamEvent.create({
    data: {
      title,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime)
    }
  })
  return NextResponse.json(event, { status: 201 })
})
