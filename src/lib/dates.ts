import { DATE_CONSTANTS } from './constants'

/**
 * Date utility functions for consistent date handling across the application
 */

/**
 * Pad a number with leading zeros
 */
export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Format a date as YYYY-MM-DD
 */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Get the start of a day (midnight)
 */
export function startOfDay(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Get the end of a day (23:59:59.999)
 */
export function endOfDay(d: Date): Date {
  const date = new Date(d)
  date.setHours(23, 59, 59, 999)
  return date
}

/**
 * Get the start of a week (Sunday)
 */
export function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const diff = date.getDay() // 0 is Sunday
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - diff)
  return date
}

/**
 * Get the end of a week (Saturday 23:59:59.999)
 */
export function endOfWeek(d: Date): Date {
  const date = new Date(d)
  const diff = 6 - date.getDay() // Days until Saturday
  date.setHours(23, 59, 59, 999)
  date.setDate(date.getDate() + diff)
  return date
}

/**
 * Get the start of a month
 */
export function startOfMonth(d: Date): Date {
  const date = new Date(d)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Get the end of a month
 */
export function endOfMonth(d: Date): Date {
  const date = new Date(d)
  date.setMonth(date.getMonth() + 1)
  date.setDate(0)
  date.setHours(23, 59, 59, 999)
  return date
}

/**
 * Add days to a date
 */
export function addDays(d: Date, days: number): Date {
  const date = new Date(d)
  date.setDate(date.getDate() + days)
  return date
}

/**
 * Add weeks to a date
 */
export function addWeeks(d: Date, weeks: number): Date {
  return addDays(d, weeks * DATE_CONSTANTS.DAYS_IN_WEEK)
}

/**
 * Add months to a date
 */
export function addMonths(d: Date, months: number): Date {
  const date = new Date(d)
  date.setMonth(date.getMonth() + months)
  return date
}

/**
 * Format a date for display (e.g., "Dec 25, 2025")
 */
export function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format a date for ISO display (e.g., "25/12/2025")
 */
export function formatIsoToDMY(isoDate: string): string {
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  const [, m, d] = parts
  return `${d}/${m}`
}

/**
 * Parse a date string from URL parameters (YYYY-MM-DD)
 */
export function parseDateParam(param: string | null): Date | null {
  if (!param) return null
  const date = new Date(param)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Check if a date is today
 */
export function isToday(d: Date): boolean {
  return isSameDay(d, new Date())
}

/**
 * Get day name abbreviation
 */
export function getDayNameAbbreviated(dayIndex: number): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return names[dayIndex] ?? ''
}

/**
 * Get day name full
 */
export function getDayName(dayIndex: number): string {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return names[dayIndex] ?? ''
}

/** Format a date as YYYY-MM. Internal; callers should reach for `bucketKey`. */
function ym(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** Format a date as YYYY. Internal; callers should reach for `bucketKey`. */
function y(d: Date): string {
  return `${d.getFullYear()}`
}

/**
 * Get the start of a year
 */
export function startOfYear(d: Date): Date {
  const date = new Date(d)
  date.setMonth(0, 1)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Get the end of a year (Dec 31 23:59:59.999)
 */
export function endOfYear(d: Date): Date {
  const date = new Date(d)
  date.setMonth(11, 31)
  date.setHours(23, 59, 59, 999)
  return date
}

/**
 * Time-series bucket granularity.
 */
export type BucketGranularity = 'day' | 'month' | 'year'

/**
 * Snap a date down to the start of its bucket.
 */
export function alignStart(granularity: BucketGranularity, d: Date): Date {
  switch (granularity) {
    case 'day':
      return startOfDay(d)
    case 'month':
      return startOfMonth(d)
    case 'year':
      return startOfYear(d)
  }
}

/**
 * Snap a date up to the end of its bucket.
 */
export function alignEnd(granularity: BucketGranularity, d: Date): Date {
  switch (granularity) {
    case 'day':
      return endOfDay(d)
    case 'month':
      return endOfMonth(d)
    case 'year':
      return endOfYear(d)
  }
}

/**
 * The canonical label for the bucket `d` falls into. Mirrors what the
 * Postgres `date_trunc(...)::date` query produces on the SQL side.
 */
export function bucketKey(granularity: BucketGranularity, d: Date): string {
  switch (granularity) {
    case 'day':
      return ymd(d)
    case 'month':
      return ym(d)
    case 'year':
      return y(d)
  }
}

/**
 * Inclusive count of buckets between `start` and `end` for the given
 * granularity. Assumes `start <= end`; returns 1 when both sit in the same
 * bucket.
 */
export function bucketCount(
  granularity: BucketGranularity,
  start: Date,
  end: Date,
): number {
  switch (granularity) {
    case 'day': {
      // Compare via UTC-anchored calendar days so a DST transition (one
      // 23-hour local day) cannot drop a bucket. Local-time diff would
      // floor (71h / 24h) = 2 across spring-forward when the true answer
      // is 3.
      const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
      const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
      const msPerDay = 24 * 60 * 60 * 1000
      return Math.round((b - a) / msPerDay) + 1
    }
    case 'month':
      return (
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) +
        1
      )
    case 'year':
      return end.getFullYear() - start.getFullYear() + 1
  }
}

/**
 * Ordered list of `bucketKey` labels covering `[start, end]` inclusive.
 */
export function buildBuckets(
  granularity: BucketGranularity,
  start: Date,
  end: Date,
): string[] {
  const labels: string[] = []
  const cursor = new Date(start)
  switch (granularity) {
    case 'day':
      while (cursor <= end) {
        labels.push(ymd(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
      return labels
    case 'month':
      cursor.setDate(1)
      while (cursor <= end) {
        labels.push(ym(cursor))
        cursor.setMonth(cursor.getMonth() + 1)
      }
      return labels
    case 'year':
      cursor.setMonth(0, 1)
      while (cursor <= end) {
        labels.push(y(cursor))
        cursor.setFullYear(cursor.getFullYear() + 1)
      }
      return labels
  }
}

/**
 * Parse a YYYY, YYYY-MM, or YYYY-MM-DD string as a local-time Date at the
 * start of the day. Falls back to `new Date(input)` for anything else, and
 * returns `null` when the result is invalid.
 *
 * Strict: `2030-13-01` and `2030-02-31` are rejected (return `null`)
 * rather than silently normalised by JS Date wrap-around. The post-
 * construction equality check ensures the calendar components round-trip.
 */
export function parseLocalDate(input: string): Date | null {
  const match = input.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/)
  if (!match) {
    const fallback = new Date(input)
    return Number.isNaN(fallback.getTime()) ? null : fallback
  }
  const year = Number(match[1])
  const month = Number(match[2] || '1') - 1
  const day = Number(match[3] || '1')
  const parsed = new Date(year, month, day)
  if (Number.isNaN(parsed.getTime())) return null
  // Reject wrap-around: "2030-13-01" → Date(2031, 0, 1), "2030-02-31" →
  // Date(2030, 2, 3). The Date constructor accepts out-of-range components
  // by overflowing; the round-trip check rejects them.
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null
  }
  return parsed
}
