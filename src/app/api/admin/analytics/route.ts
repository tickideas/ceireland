import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { DATE_CONSTANTS } from '@/lib/constants'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  ymd,
  getDayNameAbbreviated
} from '@/lib/dates'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'

    const now = new Date()
    let startDate: Date

    // Determine the window for the "Summary" filter using constants
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - DATE_CONSTANTS.MILLISECONDS_PER_WEEK)
        break
      case 'year':
        startDate = new Date(now.getTime() - DATE_CONSTANTS.MILLISECONDS_PER_YEAR)
        break
      default: // 'month'
        startDate = new Date(now.getTime() - DATE_CONSTANTS.DAYS_IN_MONTH * DATE_CONSTANTS.MILLISECONDS_PER_DAY)
    }

    // Get attendance date boundaries
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const weekStart = new Date(now.getTime() - DATE_CONSTANTS.MILLISECONDS_PER_WEEK)
    const rangeStart = startOfWeek(startDate)
    const rangeEnd = new Date(now)

    // Execute all DB queries in parallel for better performance
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
        include: { _count: { select: { attendance: true } } },
      }),
    ])

    // Pre-build daily buckets for the range
    const dailyBuckets: Record<string, { date: string; attendance: number; dayName: string }> = {}
    {
      const d = new Date(rangeStart)
      while (d <= rangeEnd) {
        const key = ymd(d)
        dailyBuckets[key] = { 
          date: key, 
          attendance: 0, 
          dayName: getDayNameAbbreviated(d.getDay()) 
        }
        d.setDate(d.getDate() + 1)
      }
    }

    // Aggregate into daily buckets
    for (const svc of servicesInWindow) {
      const key = ymd(svc.date)
      const count = svc._count?.attendance ?? 0
      if (!dailyBuckets[key]) {
        dailyBuckets[key] = { 
          date: key, 
          attendance: count, 
          dayName: getDayNameAbbreviated(new Date(svc.date).getDay()) 
        }
      } else {
        dailyBuckets[key].attendance += count
      }
    }

    // Compose chart datasets from daily buckets
    const bucketKeys = Object.keys(dailyBuckets).sort()
    const serviceData = bucketKeys.map((k) => dailyBuckets[k])
    
    // Weekly trend (aggregate by week)
    const weeklyBuckets: Record<string, number> = {}
    for (const key of bucketKeys) {
      const weekKey = ymd(startOfWeek(new Date(key)))
      weeklyBuckets[weekKey] = (weeklyBuckets[weekKey] || 0) + dailyBuckets[key].attendance
    }
    const weeklyKeys = Object.keys(weeklyBuckets).sort()
    const weeklyTrend = weeklyKeys.map((k, i) => ({ week: `Week ${i + 1}`, attendance: weeklyBuckets[k] }))

    // Role distribution
    const roleDistribution = [
      { name: 'Members', value: approvedUsers, color: '#4f46e5' },
      { name: 'Admins', value: totalUsers - approvedUsers, color: '#059669' }
    ]

    const analytics = {
      totalUsers,
      approvedUsers,
      pendingUsers,
      todayAttendance,
      weekAttendance,
      monthAttendance,
      serviceData,
      weeklyTrend,
      roleDistribution
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Get analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
