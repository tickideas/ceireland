import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { DATE_CONSTANTS } from '@/lib/constants'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  ymd,
  getDayNameAbbreviated
} from '@/lib/dates'
import { errorToResponse, logError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'

    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - DATE_CONSTANTS.MILLISECONDS_PER_WEEK)
        break
      case 'year':
        startDate = new Date(now.getTime() - DATE_CONSTANTS.MILLISECONDS_PER_YEAR)
        break
      default:
        startDate = new Date(now.getTime() - DATE_CONSTANTS.DAYS_IN_MONTH * DATE_CONSTANTS.MILLISECONDS_PER_DAY)
    }

    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const weekStart = new Date(now.getTime() - DATE_CONSTANTS.MILLISECONDS_PER_WEEK)
    const rangeStart = startOfWeek(startDate)
    const rangeEnd = new Date(now)

    const [
      totalUsers,
      approvedUsers,
      pendingUsers,
      todayAttendance,
      weekAttendance,
      monthAttendance,
      servicesInWindow,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { approved: true } }),
      prisma.user.count({ where: { approved: false } }),
      prisma.attendance.count({
        where: { checkInTime: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.attendance.count({
        where: { checkInTime: { gte: weekStart } },
      }),
      prisma.attendance.count({
        where: { checkInTime: { gte: startDate } },
      }),
      prisma.service.findMany({
        where: { date: { gte: rangeStart, lte: rangeEnd } },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          _count: { select: { attendance: true } },
        },
      }),
    ])

    const dailyBuckets: Record<string, { date: string; attendance: number; dayName: string }> = {}
    const dayCursor = new Date(rangeStart)
    while (dayCursor <= rangeEnd) {
      const key = ymd(dayCursor)
      dailyBuckets[key] = {
        date: key,
        attendance: 0,
        dayName: getDayNameAbbreviated(dayCursor.getDay())
      }
      dayCursor.setDate(dayCursor.getDate() + 1)
    }

    for (const svc of servicesInWindow) {
      const key = ymd(svc.date)
      dailyBuckets[key].attendance += svc._count?.attendance ?? 0
    }

    const bucketKeys = Object.keys(dailyBuckets).sort()
    const serviceData = bucketKeys.map((k) => dailyBuckets[k])

    const weeklyBuckets: Record<string, number> = {}
    for (const key of bucketKeys) {
      const weekKey = ymd(startOfWeek(new Date(key)))
      weeklyBuckets[weekKey] = (weeklyBuckets[weekKey] || 0) + dailyBuckets[key].attendance
    }
    const weeklyKeys = Object.keys(weeklyBuckets).sort()
    const weeklyTrend = weeklyKeys.map((k, i) => ({ week: `Week ${i + 1}`, attendance: weeklyBuckets[k] }))

    const roleDistribution = [
      { name: 'Members', value: approvedUsers, color: '#4f46e5' },
      { name: 'Admins', value: totalUsers - approvedUsers, color: '#059669' }
    ]

    return NextResponse.json({
      totalUsers,
      approvedUsers,
      pendingUsers,
      todayAttendance,
      weekAttendance,
      monthAttendance,
      serviceData,
      weeklyTrend,
      roleDistribution
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminAnalytics')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
