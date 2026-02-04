/**
 * Zod validation schemas for API endpoints
 * Provides consistent input validation across the application
 */

import { z } from 'zod'

/**
 * Auth schemas
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase()
    .trim(),
})

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase()
    .trim(),
})

export const registerSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(50, 'Title too long')
    .trim(),
  name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name too long')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name too long')
    .trim(),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .max(50, 'Phone number too long')
    .trim(),
  honeypot: z.string().optional(),
})

/**
 * User management schemas
 */
export const updateUserSchema = z.object({
  title: z.string().max(50).trim().optional(),
  name: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  email: z.string().email().max(255).toLowerCase().trim().optional(),
  phone: z.string().max(50).trim().optional(),
  approved: z.boolean().optional(),
})

export const userApprovalSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  approved: z.boolean(),
})

export const userRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN'], {
    message: 'Role must be USER or ADMIN',
  }),
})

/**
 * Banner schemas
 */
export const bannerSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .trim(),
  imageUrl: z
    .string()
    .url('Invalid image URL')
    .max(1000, 'URL too long'),
  linkUrl: z
    .string()
    .url('Invalid link URL')
    .max(1000, 'URL too long')
    .optional()
    .nullable(),
  active: z.boolean().default(true),
  order: z.number().int().min(0).max(1000).default(0),
})

export const updateBannerSchema = bannerSchema.partial()

/**
 * Stream settings schemas
 */
export const streamSettingsSchema = z.object({
  streamUrl: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string()
      .url('Invalid stream URL')
      .max(1000, 'URL too long')
      .optional()
      .nullable()
  ),
  posterUrl: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string()
      .url('Invalid poster URL')
      .max(1000, 'URL too long')
      .optional()
      .nullable()
  ),
  isActive: z.boolean().default(false),
  scheduledEndTime: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string()
      .datetime({ message: 'Invalid end time format' })
      .optional()
      .nullable()
  ),
})

/**
 * Stream scheduling schemas
 */
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

export const streamScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex, 'Time must be in HH:mm format'),
  endTime: z.string().regex(timeRegex, 'Time must be in HH:mm format'),
  label: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
})

export const streamScheduleUpdateSchema = streamScheduleSchema.partial()

export const streamEventSchema = z.object({
  title: z.string().min(1).max(200),
  startDateTime: z.string().datetime({ message: 'Invalid start date format' }),
  endDateTime: z.string().datetime({ message: 'Invalid end date format' }),
  isActive: z.boolean().optional(),
}).refine((data) => new Date(data.endDateTime) > new Date(data.startDateTime), {
  message: 'endDateTime must be after startDateTime',
  path: ['endDateTime'],
})

export const streamEventUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  startDateTime: z.string().datetime({ message: 'Invalid start date format' }).optional(),
  endDateTime: z.string().datetime({ message: 'Invalid end date format' }).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => {
  if (!data.startDateTime || !data.endDateTime) return true
  return new Date(data.endDateTime) > new Date(data.startDateTime)
}, {
  message: 'endDateTime must be after startDateTime',
  path: ['endDateTime'],
})

/**
 * Service settings schemas
 */
export const serviceSettingsSchema = z.object({
  appName: z.string().min(1).max(100).trim().optional(),
  headerTitle: z.string().min(1).max(100).trim().optional(),
  sundayLabel: z.string().min(1).max(50).trim().optional(),
  sundayTime: z.string().min(1).max(50).trim().optional(),
  wednesdayLabel: z.string().min(1).max(50).trim().optional(),
  wednesdayTime: z.string().min(1).max(50).trim().optional(),
  prayerLabel: z.string().min(1).max(50).trim().optional(),
  prayerTime: z.string().min(1).max(50).trim().optional(),
  authBackgroundUrl: z
    .string()
    .url('Invalid background URL')
    .max(1000, 'URL too long')
    .optional()
    .nullable(),
})

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(1000)),
  pageSize: z
    .string()
    .optional()
    .default('25')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(5).max(100)),
  status: z.enum(['all', 'pending']).optional().default('all'),
  search: z.string().max(200).trim().optional(),
})

/**
 * Attendance query schema
 */
export const attendanceQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  format: z.enum(['json', 'csv']).optional().default('json'),
})

/**
 * Analytics query schema
 */
export const analyticsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year']).optional().default('month'),
})

export const timeseriesQuerySchema = z.object({
  granularity: z.enum(['day', 'month', 'year']).optional().default('day'),
  format: z.enum(['json', 'csv']).optional().default('json'),
})

/**
 * Bulk user import schema
 */
export const bulkUserImportSchema = z.object({
  users: z.array(
    z.object({
      title: z.string().min(1).max(50).trim(),
      name: z.string().min(1).max(100).trim(),
      lastName: z.string().min(1).max(100).trim(),
      email: z.string().email().max(255).toLowerCase().trim(),
      phone: z.string().max(50).trim(),
      approved: z
        .union([z.boolean(), z.string()])
        .transform((val) => {
          if (typeof val === 'boolean') return val
          const lower = String(val).toLowerCase()
          return lower === 'true' || lower === '1' || lower === 'yes'
        })
        .optional()
        .default(false),
    })
  ).min(1, 'At least one user is required').max(1000, 'Maximum 1000 users per import'),
})

/**
 * Helper function to validate data against a schema
 * Returns either the validated data or throws a ValidationError
 */
export function validate<T>(schema: z.Schema<T>, data: unknown): T {
  return schema.parse(data)
}

/**
 * Helper function to safely validate data
 * Returns either { success: true, data } or { success: false, errors }
 */
export function safeValidate<T>(
  schema: z.Schema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

/**
 * Format Zod errors into user-friendly messages
 */
export function formatZodErrors(error: z.ZodError<unknown>): string[] {
  return error.issues.map((err) => {
    const path = err.path.join('.')
    return path ? `${path}: ${err.message}` : err.message
  })
}

/**
 * Email settings schema
 */
export const emailSettingsSchema = z.object({
  emailVerificationEnabled: z.boolean().optional(),
  providerApiKey: z.string().max(500).optional().nullable(),
  providerBaseUrl: z
    .string()
    .url('Invalid base URL')
    .max(500, 'URL too long')
    .optional()
    .nullable(),
  fromEmail: z
    .string()
    .email('Invalid from email')
    .max(255, 'Email too long')
    .optional()
    .nullable(),
  fromName: z.string().max(100, 'Name too long').optional().nullable(),
})

export const testEmailSchema = z.object({
  recipientEmail: z
    .string()
    .min(1, 'Recipient email is required')
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase()
    .trim(),
})

/**
 * Type exports for validated data
 */
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type BannerInput = z.infer<typeof bannerSchema>
export type StreamSettingsInput = z.infer<typeof streamSettingsSchema>
export type ServiceSettingsInput = z.infer<typeof serviceSettingsSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type AttendanceQueryInput = z.infer<typeof attendanceQuerySchema>
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>
export type TimeseriesQueryInput = z.infer<typeof timeseriesQuerySchema>
export type BulkUserImportInput = z.infer<typeof bulkUserImportSchema>
export type EmailSettingsInput = z.infer<typeof emailSettingsSchema>
export type TestEmailInput = z.infer<typeof testEmailSchema>
