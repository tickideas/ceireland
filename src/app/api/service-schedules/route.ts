import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type DayOfWeek = 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY'
type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'

const DAY_OF_WEEK_MAP: Record<DayOfWeek, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
}

function calculateNextDate(
  recurrenceType: RecurrenceType,
  dayOfWeek: DayOfWeek | null,
  dayOfMonth: number | null,
  specificDate: Date | null
): Date | null {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (recurrenceType) {
    case 'WEEKLY': {
      if (!dayOfWeek) return null
      const targetDay = DAY_OF_WEEK_MAP[dayOfWeek]
      const currentDay = today.getDay()
      let daysUntilTarget = targetDay - currentDay
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7
      }
      const nextDate = new Date(today)
      nextDate.setDate(today.getDate() + daysUntilTarget)
      return nextDate
    }

    case 'MONTHLY': {
      if (!dayOfMonth) return null
      const nextDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth)
      if (nextDate <= today) {
        nextDate.setMonth(nextDate.getMonth() + 1)
      }
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

export async function GET() {
  try {
    const schedules = await prisma.serviceSchedule.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    })

    const schedulesWithNextDate = schedules
      .map((schedule: {
        id: string
        recurrenceType: RecurrenceType
        dayOfWeek: DayOfWeek | null
        dayOfMonth: number | null
        specificDate: Date | null
        [key: string]: unknown
      }) => {
        const nextDate = calculateNextDate(
          schedule.recurrenceType,
          schedule.dayOfWeek,
          schedule.dayOfMonth,
          schedule.specificDate
        )

        return {
          ...schedule,
          nextDate: nextDate?.toISOString() ?? null,
        }
      })
      .filter((schedule: { recurrenceType: RecurrenceType; nextDate: string | null }) => {
        if (schedule.recurrenceType === 'NONE') {
          return schedule.nextDate !== null
        }
        return true
      })

    return NextResponse.json(schedulesWithNextDate)
  } catch (error) {
    console.error('Get service schedules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
