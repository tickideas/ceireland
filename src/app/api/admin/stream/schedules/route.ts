import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { streamScheduleSchema } from '@/lib/validation'

export const GET = adminRoute({}, async () => {
  return prisma.streamSchedule.findMany({
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  })
})

export const POST = adminRoute({ body: streamScheduleSchema }, async ({ body }) => {
  const { dayOfWeek, startTime, endTime, label } = body
  const schedule = await prisma.streamSchedule.create({
    data: { dayOfWeek, startTime, endTime, label: label || null }
  })
  return NextResponse.json(schedule, { status: 201 })
})
