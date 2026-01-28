"use client"

import { useMemo, memo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import HLSPlayer from '@/components/HLSPlayer'
import RhapsodyDaily from '@/components/RhapsodyDaily'
import BannerCarousel from '@/components/BannerCarousel'
import AttendanceTracker from '@/components/OpenEventAttendanceTracker'
import CTAButtons from '@/components/CTAButtons'
import Link from 'next/link'

interface Banner {
  id: string
  title: string
  imageUrl: string
  linkUrl?: string | null
  active: boolean
  order: number
}

interface ServiceSettings {
  headerTitle: string
  sundayLabel: string
  sundayTime: string
  wednesdayLabel: string
  wednesdayTime: string
  prayerLabel: string
  prayerTime: string
}

interface UpcomingSchedule {
  id: string
  name: string
  description?: string | null
  time: string
  recurrenceType: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
  dayOfWeek?: string | null
  color: string
  icon: string
  nextDate: string
}

interface ActiveEvent {
  id: string
  title: string
  description?: string | null
}

interface DashboardShellProps {
  initialUser: {
    id: string
    email: string
    name: string
    lastName?: string | null
    title?: string | null
    role: 'USER' | 'ADMIN'
  } | null
  activeEvent: ActiveEvent | null
  hasActiveEvent: boolean
  banners: Banner[]
  serviceSettings: ServiceSettings
  upcomingSchedules?: UpcomingSchedule[]
}

const MemoizedHLSPlayer = memo(HLSPlayer)
const MemoizedRhapsodyDaily = memo(RhapsodyDaily)

const colorClasses: Record<string, { border: string; text: string; bg: string; iconBg: string }> = {
  blue: { border: 'border-blue-700', text: 'text-blue-800', bg: 'bg-blue-100', iconBg: 'bg-blue-100' },
  emerald: { border: 'border-emerald-600', text: 'text-emerald-800', bg: 'bg-emerald-100', iconBg: 'bg-emerald-100' },
  amber: { border: 'border-amber-600', text: 'text-amber-800', bg: 'bg-amber-100', iconBg: 'bg-amber-100' },
  purple: { border: 'border-purple-600', text: 'text-purple-800', bg: 'bg-purple-100', iconBg: 'bg-purple-100' },
  pink: { border: 'border-pink-600', text: 'text-pink-800', bg: 'bg-pink-100', iconBg: 'bg-pink-100' },
  rose: { border: 'border-rose-600', text: 'text-rose-800', bg: 'bg-rose-100', iconBg: 'bg-rose-100' },
  indigo: { border: 'border-indigo-600', text: 'text-indigo-800', bg: 'bg-indigo-100', iconBg: 'bg-indigo-100' },
  teal: { border: 'border-teal-600', text: 'text-teal-800', bg: 'bg-teal-100', iconBg: 'bg-teal-100' },
}

const iconMap: Record<string, React.ReactNode> = {
  sun: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  book: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  heart: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  star: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  calendar: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  clock: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  users: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  pray: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
}

function formatNextDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  if (targetDate.getTime() === today.getTime()) return 'Today'
  if (targetDate.getTime() === tomorrow.getTime()) return 'Tomorrow'
  
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function DashboardShell({
  initialUser,
  activeEvent,
  hasActiveEvent,
  banners,
  serviceSettings,
  upcomingSchedules = []
}: DashboardShellProps) {
  const { user: authUser, logout } = useAuth()
  
  const user = authUser ?? initialUser

  const activeBanners = useMemo(() => 
    banners.filter(b => b.active).sort((a, b) => a.order - b.order),
    [banners]
  )

  const hasUpcomingSchedules = upcomingSchedules.length > 0

  return (
    <div className="min-h-screen bg-gray-100">
      <AttendanceTracker />

      <header className="bg-gradient-to-r from-blue-800 to-blue-900 shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div>
              <h1 className="text-2xl font-bold text-white">{serviceSettings.headerTitle}</h1>
              <p className="text-sm text-blue-100">
                {user ? (
                  <>
                    Welcome, {`${user.title || ''} ${user.name} ${user.lastName || ''}`.trim()}
                  </>
                ) : hasActiveEvent && activeEvent ? (
                  <>
                    Hello and Welcome to <span className="font-semibold">{activeEvent.title}</span>
                  </>
                ) : (
                  <>Guest</>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {user && user.role === 'ADMIN' && (
                <Link
                  href="/admin/dashboard"
                  className="bg-white hover:bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Go to Admin
                </Link>
              )}
              {user && (
                <button
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Logout
                </button>
              )}
              {!user && hasActiveEvent && (
                <Link
                  href="/login"
                  className="bg-white hover:bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Video Player + Rhapsody Side Panel */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 mb-6 lg:mb-8">
          {/* Video Player - Takes 2/3 width on desktop */}
          <div className="lg:w-2/3">
            <div className="bg-black rounded-xl shadow-xl overflow-hidden">
              <div className="aspect-video">
                <MemoizedHLSPlayer />
              </div>
            </div>
            {/* CTA Buttons directly under the player */}
            <CTAButtons />
          </div>

          {/* Rhapsody Side Panel - Height matches video player on desktop (56.25% = 9/16 aspect ratio) */}
          <div className="lg:w-1/3 bg-white rounded-xl shadow-lg flex flex-col overflow-hidden border border-gray-200 min-h-[400px] lg:min-h-0 lg:max-h-[calc((100vw-3rem)*2/3*9/16)] xl:max-h-[calc((min(100vw,1536px)-3rem-3rem)*2/3*9/16)]">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-4 py-3 flex-shrink-0">
              <h3 className="text-base font-semibold text-white text-center">
                Today in Rhapsody of Realities
              </h3>
            </div>
            <div className="px-4 py-4 flex-1 min-h-0 overflow-y-auto">
              <MemoizedRhapsodyDaily />
            </div>
          </div>
        </div>

        {/* Service Schedule Cards */}
        <div className="mb-6 lg:mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {hasUpcomingSchedules ? 'Upcoming Services' : 'Service Schedule'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hasUpcomingSchedules ? (
              upcomingSchedules.map((schedule, index) => {
                const colors = colorClasses[schedule.color] || colorClasses.blue
                const icon = iconMap[schedule.icon] || iconMap.sun
                return (
                  <div
                    key={schedule.id}
                    className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${colors.border} hover:shadow-lg transition-shadow ${
                      index === upcomingSchedules.length - 1 && upcomingSchedules.length % 3 === 1 
                        ? 'sm:col-span-2 lg:col-span-1' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-xl font-bold ${colors.text}`}>{schedule.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{schedule.time}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatNextDate(schedule.nextDate)}
                        </div>
                      </div>
                      <div className={`w-12 h-12 ${colors.iconBg} rounded-full flex items-center justify-center ${colors.text}`}>
                        {icon}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-700 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-blue-800">{serviceSettings.sundayLabel}</div>
                      <div className="text-sm text-gray-600 mt-1">{serviceSettings.sundayTime}</div>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-600 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-blue-800">{serviceSettings.wednesdayLabel}</div>
                      <div className="text-sm text-gray-600 mt-1">{serviceSettings.wednesdayTime}</div>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500 hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-blue-800">{serviceSettings.prayerLabel}</div>
                      <div className="text-sm text-gray-600 mt-1">{serviceSettings.prayerTime}</div>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Banner Carousel */}
        {activeBanners.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-5 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Announcements</h3>
            <BannerCarousel banners={activeBanners} />
          </div>
        )}
      </main>
    </div>
  )
}
