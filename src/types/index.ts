/**
 * Shared TypeScript types and interfaces
 */

// User types
export interface User {
  id: string
  title: string | null
  name: string
  lastName: string
  email: string
  phone: string | null
  approved: boolean
  role: 'USER' | 'ADMIN'
  createdAt: Date
  updatedAt: Date
}

export interface UserWithoutDates {
  id: string
  title?: string
  name: string
  lastName: string
  email: string
  phone?: string
  approved: boolean
  role: 'USER' | 'ADMIN'
}

// Session user type - used in auth context and API responses
// This is the user object returned after authentication
export interface SessionUser {
  id: string
  email: string
  name: string
  lastName?: string | null
  title?: string | null
  phone?: string | null
  role: 'USER' | 'ADMIN'
  approved: boolean
}

// Service types
export interface Service {
  id: string
  title: string
  description: string | null
  date: Date
  hlsUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Attendance types
export interface Attendance {
  id: string
  userId: string
  serviceId: string
  checkInTime: Date
}

// Banner types
export interface Banner {
  id: string
  title: string
  imageUrl: string
  linkUrl: string | null
  active: boolean
  order: number
  createdAt: Date
  updatedAt: Date
}

// Settings types
export interface StreamSettings {
  id: string
  streamUrl: string | null
  posterUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ServiceSettings {
  id: string
  appName: string
  headerTitle: string
  sundayLabel: string
  sundayTime: string
  wednesdayLabel: string
  wednesdayTime: string
  prayerLabel: string
  prayerTime: string
  authBackgroundUrl: string | null
  createdAt: Date
  updatedAt: Date
}

// API Response types
export type ApiResponse<T> = {
  success: true
  data: T
} | {
  success: false
  error: string
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationInfo
}

// Analytics types
export interface AnalyticsData {
  totalUsers: number
  approvedUsers: number
  pendingUsers: number
  todayAttendance: number
  weekAttendance: number
  monthAttendance: number
  serviceData: ServiceAttendanceData[]
  weeklyTrend: WeeklyTrendData[]
  roleDistribution: RoleDistribution[]
}

export interface ServiceAttendanceData {
  date: string
  sunday: number
  wednesday: number
}

export interface WeeklyTrendData {
  week: string
  attendance: number
}

export interface RoleDistribution {
  name: string
  value: number
  color: string
}

export interface TimeseriesDataPoint {
  label: string
  usersCreated: number
  usersApprovedCreated: number
  attendanceCount: number
  servicesCount: number
}

// Rhapsody types
export interface RhapsodyPost {
  title: string
  confession: string
  body: string
  reflection: string
  prayer: string
  furtherStudy: string
  actionPoint: string
  bibleInOneYear: string
  date: string
}

// User import types
export interface UserImportData {
  title?: string
  name: string
  lastName: string
  email: string
  phone?: string
  approved?: boolean
  role?: 'USER' | 'ADMIN'
}

export interface ImportResult {
  success: boolean
  imported: number
  failed: number
  errors: string[]
  duplicates?: string[]
}

// Form data types
export interface LoginFormData {
  email: string
}

export interface RegisterFormData {
  title: string
  name: string
  lastName: string
  email: string
  phone: string
  honeypot: string
}

export interface BannerFormData {
  title: string
  imageUrl: string
  linkUrl?: string
  active: boolean
  order: number
}

export interface StreamFormData {
  streamUrl: string
  posterUrl: string
  isActive: boolean
}

export interface ServiceSettingsFormData {
  appName: string
  headerTitle: string
  sundayLabel: string
  sundayTime: string
  wednesdayLabel: string
  wednesdayTime: string
  prayerLabel: string
  prayerTime: string
  authBackgroundUrl: string
}

// Utility types
export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]

export type Nullable<T> = T | null
export type Optional<T> = T | undefined
