'use client'

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import type { SessionUser } from '@/types'

interface AuthContextType {
  user: SessionUser | null
  loading: boolean
  isCheckingAuth: boolean
  login: (user: SessionUser) => void
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
  initialUser?: SessionUser | null
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<SessionUser | null>(initialUser)
  const [loading, setLoading] = useState(!initialUser)
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)

  const checkAuth = useCallback(async () => {
    setIsCheckingAuth(true)
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setLoading(false)
      setIsCheckingAuth(false)
    }
  }, [])

  const refreshAuth = useCallback(async () => {
    await checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!initialUser) {
      checkAuth()
    }
  }, [initialUser, checkAuth])

  const login = useCallback((userData: SessionUser) => {
    setUser(userData)
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    isCheckingAuth,
    login,
    logout,
    refreshAuth
  }), [user, loading, isCheckingAuth, login, logout, refreshAuth])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
