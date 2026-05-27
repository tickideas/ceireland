import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { ValidationError } from '@/lib/errors'

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
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29))
    return { start, end }
  }
  if (granularity === 'month') {
    const end = endOfMonth(now)
    const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 11, 1))
    return { start, end }
  }
  const end = endOfYear(now)
  const start = startOfYear(new Date(now.getFullYear() - 4, 0, 1))
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

const querySchema = z.object({
  granularity: z.enum(['day', 'month', 'year']).optional(),
  format: z.enum(['json', 'csv']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export const GET = adminRoute({ query: querySchema }, async ({ query }) => {
    const gran: Granularity = query.granularity ?? 'month'
    const format = query.format ?? 'json'

    let { start, end } = defaultRange(gran)
    if (query.from) {
      const parsedFrom = parseLocalDate(query.from)
      if (!parsedFrom) {
        throw new ValidationError('Invalid from date')
      }
      start = alignStart(gran, parsedFrom)
    }
    if (query.to) {
      const parsedTo = parseLocalDate(query.to)
      if (!parsedTo) {
        throw new ValidationError('Invalid to date')
      }
      end = alignEnd(gran, parsedTo)
    }

    if (start > end) {
      throw new ValidationError('Invalid date range')
    }

    const totalBuckets = bucketCount(gran, start, end)
    if (totalBuckets > MAX_BUCKETS[gran]) {
      throw new ValidationError('Date range too large')
    }

    const labels = buildBuckets(gran, start, end)
    const unit = dateTruncUnit(gran)

    type UserRow = { bucket: Date; userscreated: bigint; usersapproved: bigint }
    type SimpleRow = { bucket: Date; count: bigint }

    const [userRows, attendanceRows, serviceRows] = await Promise.all([
      prisma.$queryRaw<UserRow[]>`
        SELECT
          date_trunc(${unit}, "createdAt")::date AS bucket,
          COUNT(*)::bigint AS "userscreated",
          COUNT(*) FILTER (WHERE "approved" = TRUE)::bigint AS "usersapproved"
        FROM "users"
        WHERE "createdAt" BETWEEN ${start} AND ${end}
        GROUP BY 1
        ORDER BY 1
      `,
      prisma.$queryRaw<SimpleRow[]>`
        SELECT
          date_trunc(${unit}, "checkInTime")::date AS bucket,
          COUNT(*)::bigint AS "count"
        FROM "attendance"
        WHERE "checkInTime" BETWEEN ${start} AND ${end}
        GROUP BY 1
        ORDER BY 1
      `,
      prisma.$queryRaw<SimpleRow[]>`
        SELECT
          date_trunc(${unit}, "date")::date AS bucket,
          COUNT(*)::bigint AS "count"
        FROM "services"
        WHERE "date" BETWEEN ${start} AND ${end}
        GROUP BY 1
        ORDER BY 1
      `,
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

    return { granularity: gran, start, end, labels, data }
})
