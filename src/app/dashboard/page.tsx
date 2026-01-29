import { redirect } from 'next/navigation'
import { getUserFromCookies, getCurrentOpenEvent } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getServiceSettingsCached } from '@/lib/serviceSettings'
import DashboardShell from './DashboardShell'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getServiceSettingsCached()
    const appName = settings?.appName ?? 'Church App'
    return {
      title: `${appName} - Dashboard`,
    }
  } catch {
    return {
      title: 'Church App - Dashboard',
    }
  }
}



function calculateNextDate(
  recurrenceType: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
  dayOfWeek: string | null,
  dayOfMonth: number | null,
  specificDate: Date | null
): Date | null {
  const DAY_MAP: Record<string, number> = {
    SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
  }
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (recurrenceType) {
    case 'WEEKLY': {
      if (!dayOfWeek) return null
      const targetDay = DAY_MAP[dayOfWeek]
      const currentDay = today.getDay()
      let daysUntilTarget = targetDay - currentDay
      if (daysUntilTarget <= 0) daysUntilTarget += 7
      const nextDate = new Date(today)
      nextDate.setDate(today.getDate() + daysUntilTarget)
      return nextDate
    }
    case 'MONTHLY': {
      if (!dayOfMonth) return null
      const nextDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth)
      if (nextDate <= today) nextDate.setMonth(nextDate.getMonth() + 1)
      return nextDate
    }
    case 'DAILY': {
      const nextDate = new Date(today)
      nextDate.setDate(today.getDate() + 1)
      return nextDate
    }
    case 'NONE': {
      if (!specificDate) return null
      const specDate = new Date(specificDate)
      return specDate > today ? specDate : null
    }
    default:
      return null
  }
}

export default async function DashboardPage() {
  const [user, openEventData, banners, serviceSettingsData, serviceSchedules] = await Promise.all([
    getUserFromCookies(),
    getCurrentOpenEvent(),
    prisma.banner.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        linkUrl: true,
        active: true,
        order: true
      }
    }),
    getServiceSettingsCached(),
    prisma.serviceSchedule.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })
  ])

  const { hasActiveEvent, activeEvent } = openEventData

  if (!user && !hasActiveEvent) {
    redirect('/login')
  }

  const serviceSettings = {
    headerTitle: serviceSettingsData?.headerTitle ?? 'Church Service',
    sundayLabel: serviceSettingsData?.sundayLabel ?? 'Sunday',
    sundayTime: serviceSettingsData?.sundayTime ?? '10:00 AM',
    wednesdayLabel: serviceSettingsData?.wednesdayLabel ?? 'Wednesday',
    wednesdayTime: serviceSettingsData?.wednesdayTime ?? '7:00 PM',
    prayerLabel: serviceSettingsData?.prayerLabel ?? 'Prayer',
    prayerTime: serviceSettingsData?.prayerTime ?? 'Daily 6:00 AM'
  }

  const formattedBanners = banners.map((b: typeof banners[number]) => ({
    ...b,
    linkUrl: b.linkUrl
  }))

  const upcomingSchedules = serviceSchedules
    .map((schedule: typeof serviceSchedules[number]) => {
      const nextDate = calculateNextDate(
        schedule.recurrenceType as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
        schedule.dayOfWeek,
        schedule.dayOfMonth,
        schedule.specificDate
      )
      return {
        id: schedule.id,
        name: schedule.name,
        description: schedule.description,
        time: schedule.time,
        recurrenceType: schedule.recurrenceType as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
        dayOfWeek: schedule.dayOfWeek,
        color: schedule.color,
        icon: schedule.icon,
        nextDate: nextDate?.toISOString() ?? ''
      }
    })
    .filter((schedule: { recurrenceType: string; nextDate: string }) => {
      if (schedule.recurrenceType === 'NONE') {
        return schedule.nextDate !== ''
      }
      return schedule.nextDate !== ''
    })

  return (
    <DashboardShell
      initialUser={user}
      activeEvent={activeEvent ? {
        id: activeEvent.id,
        title: activeEvent.title,
        description: activeEvent.description
      } : null}
      hasActiveEvent={hasActiveEvent}
      banners={formattedBanners}
      serviceSettings={serviceSettings}
      upcomingSchedules={upcomingSchedules}
    />
  )
}
