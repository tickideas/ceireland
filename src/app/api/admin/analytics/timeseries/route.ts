import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { Prisma } from '@prisma/client'

type Granularity = 'day' | 'month' | 'year'

const MAX_BUCKETS: Record<Granularity, number> = {
  day: 366,
  month: 120,
  year: 20,
}

function pad(n: number) { return String(n).padStart(2, '0') }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function ym(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` }
function y(d: Date) { return `${d.getFullYear()}` }

function startOfDay(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0) }
function endOfDay(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999) }
function startOfMonth(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0) }
function endOfMonth(date: Date): Date { return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999) }
function startOfYear(date: Date): Date { return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0) }
function endOfYear(date: Date): Date { return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999) }

function defaultRange(granularity: Granularity) {
  const now = new Date()
  if (granularity === 'day') {
    const end = endOfDay(now)
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)) // last 30 days
    return { start, end }
  }
  if (granularity === 'month') {
    const end = endOfMonth(now)
    const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 11, 1)) // last 12 months
    return { start, end }
  }
  const end = endOfYear(now)
  const start = startOfYear(new Date(now.getFullYear() - 4, 0, 1)) // last 5 years
  return { start, end }
}

function buildBuckets(granularity: Granularity, start: Date, end: Date): string[] {
  const labels: string[] = []
  const d = new Date(start)
  if (granularity === 'day') {
    while (d <= end) {
      labels.push(ymd(d))
      d.setDate(d.getDate() + 1)
    }
    return labels
  }
  if (granularity === 'month') {
    d.setDate(1)
    while (d <= end) {
      labels.push(ym(d))
      d.setMonth(d.getMonth() + 1)
    }
    return labels
  }
  d.setMonth(0, 1)
  while (d <= end) {
    labels.push(y(d))
    d.setFullYear(d.getFullYear() + 1)
  }
  return labels
}

function keyFor(granularity: Granularity, date: Date): string {
  if (granularity === 'day') return ymd(date)
  if (granularity === 'month') return ym(date)
  return y(date)
}

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

function dateTruncUnit(gran: Granularity): 'day' | 'month' | 'year' {
  switch (gran) {
    case 'day':
      return 'day'
    case 'month':
      return 'month'
    case 'year':
      return 'year'
  }
}

function parseLocalDate(input: string): Date | null {
  const match = input.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/)
  if (!match) {
    const fallback = new Date(input)
    return Number.isNaN(fallback.getTime()) ? null : fallback
  }
  const year = Number(match[1])
  const month = Number(match[2] || '1') - 1
  const day = Number(match[3] || '1')
  const parsed = new Date(year, month, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function bucketCount(granularity: Granularity, start: Date, end: Date): number {
  if (granularity === 'day') {
    const startDay = startOfDay(start)
    const endDay = startOfDay(end)
    const msPerDay = 24 * 60 * 60 * 1000
    return Math.floor((endDay.getTime() - startDay.getTime()) / msPerDay) + 1
  }
  if (granularity === 'month') {
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
  }
  return end.getFullYear() - start.getFullYear() + 1
}

function alignStart(granularity: Granularity, date: Date): Date {
  switch (granularity) {
    case 'day':
      return startOfDay(date)
    case 'month':
      return startOfMonth(date)
    case 'year':
      return startOfYear(date)
  }
}

function alignEnd(granularity: Granularity, date: Date): Date {
  switch (granularity) {
    case 'day':
      return endOfDay(date)
    case 'month':
      return endOfMonth(date)
    case 'year':
      return endOfYear(date)
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const granularityParam = searchParams.get('granularity')
    if (granularityParam && !['day', 'month', 'year'].includes(granularityParam)) {
      return NextResponse.json({ error: 'Invalid granularity' }, { status: 400 })
    }
    const gran = (granularityParam as Granularity) || 'month'

    const format = searchParams.get('format') || 'json'
    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    let { start, end } = defaultRange(gran)
    if (fromParam) {
      const parsedFrom = parseLocalDate(fromParam)
      if (!parsedFrom) return NextResponse.json({ error: 'Invalid from date' }, { status: 400 })
      start = alignStart(gran, parsedFrom)
    }
    if (toParam) {
      const parsedTo = parseLocalDate(toParam)
      if (!parsedTo) return NextResponse.json({ error: 'Invalid to date' }, { status: 400 })
      end = alignEnd(gran, parsedTo)
    }

    if (start > end) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    const totalBuckets = bucketCount(gran, start, end)
    if (totalBuckets > MAX_BUCKETS[gran]) {
      return NextResponse.json({ error: 'Date range too large' }, { status: 400 })
    }

    const labels = buildBuckets(gran, start, end)
    const unit = dateTruncUnit(gran)

    type UserRow = { bucket: Date; userscreated: bigint; usersapproved: bigint }
    type SimpleRow = { bucket: Date; count: bigint }

    // Use raw SQL with date_trunc to aggregate at DB level - much more efficient than fetching all rows
    const [userRows, attendanceRows, serviceRows] = await Promise.all([
      prisma.$queryRaw<UserRow[]>(
        Prisma.sql`
          SELECT
            date_trunc(${unit}, "createdAt")::date AS bucket,
            COUNT(*)::bigint AS "userscreated",
            COUNT(*) FILTER (WHERE "approved" = TRUE)::bigint AS "usersapproved"
          FROM "users"
          WHERE "createdAt" BETWEEN ${start} AND ${end}
          GROUP BY 1
          ORDER BY 1
        `
      ),
      prisma.$queryRaw<SimpleRow[]>(
        Prisma.sql`
          SELECT
            date_trunc(${unit}, "checkInTime")::date AS bucket,
            COUNT(*)::bigint AS "count"
          FROM "attendance"
          WHERE "checkInTime" BETWEEN ${start} AND ${end}
          GROUP BY 1
          ORDER BY 1
        `
      ),
      prisma.$queryRaw<SimpleRow[]>(
        Prisma.sql`
          SELECT
            date_trunc(${unit}, "date")::date AS bucket,
            COUNT(*)::bigint AS "count"
          FROM "services"
          WHERE "date" BETWEEN ${start} AND ${end}
          GROUP BY 1
          ORDER BY 1
        `
      ),
    ])

    const usersCreated: Record<string, number> = Object.fromEntries(labels.map((l) => [l, 0]))
    const usersApprovedCreated: Record<string, number> = Object.fromEntries(labels.map((l) => [l, 0]))
    const attendanceCount: Record<string, number> = Object.fromEntries(labels.map((l) => [l, 0]))
    const servicesCount: Record<string, number> = Object.fromEntries(labels.map((l) => [l, 0]))

    const toLabel = (d: Date) => keyFor(gran, d)

    for (const row of userRows) {
      const label = toLabel(row.bucket)
      if (label in usersCreated) {
        usersCreated[label] = Number(row.userscreated)
        usersApprovedCreated[label] = Number(row.usersapproved)
      }
    }

    for (const row of attendanceRows) {
      const label = toLabel(row.bucket)
      if (label in attendanceCount) attendanceCount[label] = Number(row.count)
    }

    for (const row of serviceRows) {
      const label = toLabel(row.bucket)
      if (label in servicesCount) servicesCount[label] = Number(row.count)
    }

    const data = labels.map((label) => ({
      label,
      usersCreated: usersCreated[label] || 0,
      usersApprovedCreated: usersApprovedCreated[label] || 0,
      attendanceCount: attendanceCount[label] || 0,
      servicesCount: servicesCount[label] || 0,
    }))

    if (format === 'csv') {
      const headers = ['Label', 'Users Created', 'Users Approved Created', 'Attendance Count', 'Services Count']
      const rows = data.map((r) => [
        csvEscape(r.label),
        csvEscape(r.usersCreated),
        csvEscape(r.usersApprovedCreated),
        csvEscape(r.attendanceCount),
        csvEscape(r.servicesCount)
      ].join(','))
      const csv = [headers.join(','), ...rows].join('\n') + '\n'
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="timeseries_${gran}.csv"`
        }
      })
    }

    return NextResponse.json({ granularity: gran, start, end, labels, data })
  } catch (error) {
    console.error('Get timeseries analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
