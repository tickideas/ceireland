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
