'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import AdminLayout, { type AdminTab } from '@/components/admin/AdminLayout'

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
)

const UserManagement = dynamic(() => import('@/components/admin/UserManagement'), {
  ssr: false,
  loading: LoadingSpinner
})

const BannerManagement = dynamic(() => import('@/components/admin/BannerManagement'), {
  ssr: false,
  loading: LoadingSpinner
})

const AnalyticsDashboard = dynamic(() => import('@/components/admin/AnalyticsDashboard'), {
  ssr: false,
  loading: LoadingSpinner
})

const UserImport = dynamic(() => import('@/components/admin/UserImport'), {
  ssr: false,
  loading: LoadingSpinner
})

const StreamManagement = dynamic(() => import('@/components/admin/StreamManagement'), {
  ssr: false,
  loading: LoadingSpinner
})

const ServiceSettingsManagement = dynamic(() => import('@/components/admin/ServiceSettingsManagement'), {
  ssr: false,
  loading: LoadingSpinner
})

const ScheduleManagement = dynamic(() => import('@/components/admin/ScheduleManagement'), {
  ssr: false,
  loading: LoadingSpinner
})

const AttendanceReport = dynamic(() => import('@/components/admin/AttendanceReport'), {
  ssr: false,
  loading: LoadingSpinner
})

const OpenEventManager = dynamic(() => import('@/components/admin/OpenEventManager'), {
  ssr: false,
  loading: LoadingSpinner
})

const CTAManagement = dynamic(() => import('@/components/admin/CTAManagement'), {
  ssr: false,
  loading: LoadingSpinner
})

const EmailSettingsManagement = dynamic(() => import('@/components/admin/EmailSettingsManagement'), {
  ssr: false,
  loading: LoadingSpinner
})

export default function AdminDashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-lg"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    return null
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AnalyticsDashboard />
      case 'users':
        return <UserManagement />
      case 'banners':
        return <BannerManagement />
      case 'stream':
        return <StreamManagement />
      case 'service':
        return <ServiceSettingsManagement />
      case 'schedules':
        return <ScheduleManagement />
      case 'import':
        return <UserImport />
      case 'reports':
        return <AttendanceReport />
      case 'openEvents':
        return <OpenEventManager />
      case 'cta':
        return <CTAManagement />
      case 'email':
        return <EmailSettingsManagement />
      default:
        return <AnalyticsDashboard />
    }
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  )
}
