/**
 * Application-wide constants
 * Centralized configuration values for consistency
 */

// Authentication & Security
export const AUTH = {
  JWT_EXPIRY: '7d',
  COOKIE_NAME: 'auth-token',
  COOKIE_MAX_AGE: 7 * 24 * 60 * 60, // 7 days in seconds
  SESSION_TIMEOUT: 15 * 60 * 1000, // 15 minutes in milliseconds
} as const

// Rate Limiting
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW: 15 * 60 * 1000, // 15 minutes
  API_REQUESTS: 100,
  API_WINDOW: 60 * 1000, // 1 minute
} as const

// Viewer Tracking
export const VIEWER_TRACKING = {
  HEARTBEAT_INTERVAL: 20 * 1000, // 20 seconds
  SESSION_TIMEOUT: 60 * 1000, // 60 seconds (active viewer threshold)
  CLEANUP_THRESHOLD: 2 * 60 * 1000, // 2 minutes (stale session cleanup)
} as const

// File Upload Limits
export const FILE_LIMITS = {
  MAX_BANNER_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_POSTER_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_BACKGROUND_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  MIN_LIMIT: 10,
} as const

// User Roles
export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const

// Service Days (all days of week supported for daily attendance tracking)
export const SERVICE_DAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const

export const SERVICE_TITLES = {
  SUNDAY: 'Sunday Service',
  MONDAY: 'Monday Service',
  TUESDAY: 'Tuesday Service',
  WEDNESDAY: 'Wednesday Service',
  THURSDAY: 'Thursday Service',
  FRIDAY: 'Friday Service',
  SATURDAY: 'Saturday Service',
} as const

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

// Analytics & Reports
export const ANALYTICS = {
  DEFAULT_PERIOD: 'month',
  DEFAULT_GRANULARITY: 'day',
  AVAILABLE_PERIODS: ['week', 'month', 'year'] as const,
  AVAILABLE_GRANULARITIES: ['day', 'month', 'year'] as const,
  MAX_TIMESERIES_POINTS: 365, // Maximum data points to return
} as const

// Cache TTL (Time To Live in seconds)
export const CACHE_TTL = {
  STREAM_SETTINGS: 60, // 1 minute
  SERVICE_SETTINGS: 300, // 5 minutes
  BANNERS: 60, // 1 minute
  VIEWER_COUNT: 10, // 10 seconds
} as const

// Bulk Import
export const BULK_IMPORT = {
  DEFAULT_CHUNK_SIZE: 100,
  MIN_CHUNK_SIZE: 10,
  MAX_CHUNK_SIZE: 1000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
} as const

// Email Configuration
export const EMAIL = {
  DEFAULT_FROM: 'noreply@churchapp.com',
  APPROVAL_SUBJECT: 'Your Account Has Been Approved',
} as const

// API Response Messages
export const API_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized - Please login',
  FORBIDDEN: 'Forbidden - Insufficient permissions',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
  RATE_LIMIT_EXCEEDED: 'Too many requests - Please try again later',
} as const

// Database
export const DB = {
  CONNECTION_POOL_SIZE: 10,
  CONNECTION_TIMEOUT: 20000, // 20 seconds
} as const

// Rhapsody Devotional
export const RHAPSODY = {
  DEFAULT_BASE_URL: 'https://read.rhapsodyofrealities.org',
  DEFAULT_LANGUAGE: 'english',
  CACHE_TTL: 3600, // 1 hour
} as const

// Date & Time Constants
export const DATE_CONSTANTS = {
  MILLISECONDS_PER_DAY: 24 * 60 * 60 * 1000,
  MILLISECONDS_PER_WEEK: 7 * 24 * 60 * 60 * 1000,
  MILLISECONDS_PER_YEAR: 365 * 24 * 60 * 60 * 1000,
  DAYS_IN_WEEK: 7,
  DAYS_IN_MONTH: 30,
  DAYS_IN_YEAR: 365,
} as const

// Type exports for TypeScript
export type Role = typeof ROLES[keyof typeof ROLES]
export type ServiceDay = typeof SERVICE_DAYS[keyof typeof SERVICE_DAYS]
export type AnalyticsPeriod = typeof ANALYTICS.AVAILABLE_PERIODS[number]
export type AnalyticsGranularity = typeof ANALYTICS.AVAILABLE_GRANULARITIES[number]
