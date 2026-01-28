'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface LoginPageContentProps {
  initialAppName: string
  initialBgUrl: string | null
}

export default function LoginPageContent({ initialAppName, initialBgUrl }: LoginPageContentProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setShowRegisterPrompt(false)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        login(data.user)
        if (data.user.role === 'ADMIN') {
          router.push('/admin/dashboard')
        } else {
          router.push('/dashboard')
        }
      } else {
        // Improved error message for user not found
        if (data.error === 'User not found') {
          setError("We couldn't find an account with that email address.")
          setShowRegisterPrompt(true)
        } else if (data.error === 'Account not approved yet') {
          setError('Your account is pending approval. Please wait for an administrator to approve your account.')
        } else {
          setError(data.error)
        }
      }
    } catch (error) {
      setError('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterRedirect = () => {
    router.push('/register')
  }

  return (
    <div
      className="relative min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center"
      style={initialBgUrl ? { backgroundImage: `url(${initialBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {/* Dark overlay for contrast when background image is set */}
      {initialBgUrl && <div className="absolute inset-0 bg-black/50" aria-hidden="true" />}

      <div className="relative z-10 w-full max-w-md sm:max-w-lg">
        <div className="bg-white/85 backdrop-blur-sm rounded-lg shadow p-8 space-y-6">
          <div>
            <h2 className="mt-2 text-center text-2xl md:text-3xl text-gray-900">
              Welcome to
            </h2>
            <h1 className="text-center text-2xl md:text-3xl font-bold text-indigo-700 break-words">
              {initialAppName}
            </h1>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
              {showRegisterPrompt && (
                <div className="mt-3 pt-3 border-t border-red-300">
                  <p className="text-sm text-red-600 mb-2">
                    Don&apos;t have an account yet?
                  </p>
                  <button
                    onClick={handleRegisterRedirect}
                    className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Create Account
                  </button>
                </div>
              )}
            </div>
          )}

          <form className="space-y-6 mt-4" onSubmit={handleSubmit}>
            <div>
              <input
                id="email"
                type="email"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white/90"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address to sign in"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
            <div className="text-center text-sm text-gray-700 mt-2">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                Register here
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}