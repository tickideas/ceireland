'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useOpenEvent } from '@/hooks/useOpenEvent'

export default function HomePage() {
  const { user, loading, isCheckingAuth } = useAuth()
  const { hasActiveEvent, loading: openEventLoading } = useOpenEvent()
  const router = useRouter()

  useEffect(() => {
    console.log('Debug: Authentication and open event status', {
      user: !!user,
      userRole: user?.role,
      loading,
      isCheckingAuth,
      openEventLoading,
      hasActiveEvent,
      activeEvent: hasActiveEvent ? 'Active' : 'Inactive'
    })

    // Wait for both auth and open event checks to complete
    if (!loading && !openEventLoading) {
      console.log('Debug: Making routing decision')
      
      // Small delay to ensure all state updates are complete
      const timer = setTimeout(() => {
        if (user) {
          console.log('Debug: User authenticated, redirecting')
          if (user.role === 'ADMIN') {
            router.push('/admin/dashboard')
          } else {
            router.push('/dashboard')
          }
        } else if (hasActiveEvent) {
          console.log('Debug: No user but active open event, redirecting to dashboard')
          // If there's an active open event, redirect to dashboard without requiring login
          router.push('/dashboard')
        } else {
          console.log('Debug: No user and no open event, redirecting to login')
          router.push('/login')
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [user, loading, hasActiveEvent, openEventLoading, router])

  if (loading || openEventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return null
}
