import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { ValidationError } from '@/lib/errors'
import { csvEscape } from '@/lib/csv'
import {
  type BucketGranularity,
  alignEnd,
  alignStart,
  bucketCount,
  bucketKey,
  buildBuckets,
  endOfDay,
  endOfMonth,
  endOfYear,
  parseLocalDate,
  startOfDay,
  startOfMonth,
  startOfYear,
} from '@/lib/dates'

const MAX_BUCKETS: Record<BucketGranularity, number> = {
  day: 366,
  month: 120,
  year: 20,
}

function defaultRange(granularity: BucketGranularity) {
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

const querySchema = z.object({
  granularity: z.enum(['day', 'month', 'year']).optional(),
  format: z.enum(['json', 'csv']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export const GET = adminRoute({ query: querySchema }, async ({ query }) => {
  const gran: BucketGranularity = query.granularity ?? 'month'
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
  // Postgres `date_trunc` takes the same string literals as our granularity.
  const unit = gran

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

  const toLabel = (d: Date) => bucketKey(gran, d)

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
      csvEscape(r.servicesCount),
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n') + '\n'
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="timeseries_${gran}.csv"`,
      },
    })
  }

  return { granularity: gran, start, end, labels, data }
})
