import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { streamSettingsSchema } from '@/lib/validation'

export const GET = adminRoute({}, async () => {
  const [streamSettings, schedules, events] = await Promise.all([
    prisma.streamSettings.findFirst(),
    prisma.streamSchedule.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }),
    prisma.streamEvent.findMany({ orderBy: { startDateTime: 'asc' } })
  ])

  return {
    streamUrl: streamSettings?.streamUrl || '',
    posterUrl: streamSettings?.posterUrl || '',
    isActive: streamSettings?.isActive || false,
    scheduledEndTime: streamSettings?.scheduledEndTime || null,
    schedules,
    events
  }
})

export const PUT = adminRoute({ body: streamSettingsSchema }, async ({ body }) => {
  const { streamUrl, posterUrl, isActive, scheduledEndTime } = body
  const endTime = scheduledEndTime ? new Date(scheduledEndTime) : null

  let streamSettings = await prisma.streamSettings.findFirst()

  if (streamSettings) {
    streamSettings = await prisma.streamSettings.update({
      where: { id: streamSettings.id },
      data: {
        streamUrl: streamUrl || null,
        posterUrl: posterUrl || null,
        isActive: isActive ?? false,
        scheduledEndTime: endTime
      }
    })
  } else {
    streamSettings = await prisma.streamSettings.create({
      data: {
        streamUrl: streamUrl || null,
        posterUrl: posterUrl || null,
        isActive: isActive ?? false,
        scheduledEndTime: endTime
      }
    })
  }

  return {
    message: 'Stream settings updated successfully',
    streamUrl: streamSettings.streamUrl,
    posterUrl: streamSettings.posterUrl,
    isActive: streamSettings.isActive,
    scheduledEndTime: streamSettings.scheduledEndTime
  }
})
