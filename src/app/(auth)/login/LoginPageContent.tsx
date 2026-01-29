'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface LoginPageContentProps {
  initialAppName: string
  initialBgUrl: string | null
  initialLogoUrl: string | null
  initialWelcomeHeading: string
  initialTagline: string
  initialFooterText: string
}

export default function LoginPageContent({ initialAppName, initialBgUrl, initialLogoUrl, initialWelcomeHeading, initialTagline, initialFooterText }: LoginPageContentProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
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
    <div className="min-h-screen flex font-[var(--font-dm-sans)]">
      {/* ===== Left Panel: Decorative Brand Panel ===== */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden"
        style={{
          background: initialBgUrl
            ? `url(${initialBgUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, var(--auth-navy) 0%, var(--auth-blue) 50%, var(--auth-navy-light) 100%)`
        }}
      >
        {/* Overlay for background images */}
        {initialBgUrl && (
          <div className="absolute inset-0 bg-[var(--auth-navy)]/80" />
        )}

        {/* Abstract decorative elements */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {/* Large glowing orb top-right */}
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full auth-animate-float"
            style={{
              background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)',
            }}
          />
          {/* Small glowing orb bottom-left */}
          <div
            className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full auth-animate-float"
            style={{
              background: 'radial-gradient(circle, rgba(30,58,95,0.4) 0%, transparent 70%)',
              animationDelay: '3s',
            }}
          />
          {/* Subtle grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
          {/* Diagonal gold accent line */}
          <div
            className="absolute top-0 right-[40%] w-px h-full opacity-10"
            style={{
              background: 'linear-gradient(to bottom, transparent, var(--auth-gold), transparent)',
              transform: 'rotate(15deg)',
              transformOrigin: 'top center',
            }}
          />
        </div>

        {/* Brand content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Top: Logo area */}
          <div className="auth-animate-fade-up auth-stagger-1">
            <div className="flex items-center gap-3">
              {initialLogoUrl ? (
                <img src={initialLogoUrl} alt={initialAppName} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, var(--auth-gold), var(--auth-gold-light))' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L12 22" />
                    <path d="M5 8L19 8" />
                  </svg>
                </div>
              )}
              <span className="text-white/80 text-sm font-medium tracking-wide uppercase">
                {initialAppName}
              </span>
            </div>
          </div>

          {/* Center: Hero text */}
          <div className="space-y-6">
            <div className="auth-animate-fade-up auth-stagger-2">
              <div className="auth-shimmer h-0.5 w-16 rounded-full mb-8" />
              <h1
                className="text-4xl xl:text-5xl leading-tight text-white font-[var(--font-dm-serif)]"
              >
                Welcome to<br />
                <span style={{ color: 'var(--auth-gold)' }}>{initialWelcomeHeading}</span>
              </h1>
            </div>
            <p className="text-white/50 text-lg max-w-md leading-relaxed auth-animate-fade-up auth-stagger-3">
              {initialTagline}
            </p>
          </div>

          {/* Bottom: Decorative footer */}
          <div className="auth-animate-fade-up auth-stagger-4">
            <div className="flex items-center gap-4 text-white/30 text-sm">
              <div className="h-px flex-1 bg-white/10" />
              <span className="tracking-widest uppercase text-xs">{initialFooterText}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Right Panel: Sign In Form ===== */}
      <div
        className="flex-1 flex items-center justify-center relative"
        style={{ background: 'var(--auth-cream)' }}
      >
        {/* Mobile: background image support */}
        {initialBgUrl && (
          <>
            <div
              className="lg:hidden absolute inset-0"
              style={{ backgroundImage: `url(${initialBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div className="lg:hidden absolute inset-0 bg-[var(--auth-cream)]/95" />
          </>
        )}

        {/* Subtle background texture for right panel */}
        <div
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, var(--auth-navy) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 w-full max-w-md px-6 sm:px-10 py-12">
          {/* Mobile header - shown only on small screens */}
          <div className="lg:hidden mb-10 auth-animate-fade-up">
            <div className="flex items-center gap-3 mb-6">
              {initialLogoUrl ? (
                <img src={initialLogoUrl} alt={initialAppName} className="h-9 w-9 rounded-lg object-contain" />
              ) : (
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, var(--auth-gold), var(--auth-gold-light))' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L12 22" />
                    <path d="M5 8L19 8" />
                  </svg>
                </div>
              )}
              <span
                className="text-sm font-medium tracking-wide uppercase"
                style={{ color: 'var(--auth-navy)' }}
              >
                {initialAppName}
              </span>
            </div>
            <h1
              className="text-3xl font-[var(--font-dm-serif)]"
              style={{ color: 'var(--auth-navy)' }}
            >
              Welcome to<br />
              <span style={{ color: 'var(--auth-gold-muted)' }}>{initialWelcomeHeading}</span>
            </h1>
          </div>

          {/* Form header */}
          <div className="auth-animate-fade-up auth-stagger-1">
            <h2
              className="text-2xl font-semibold mb-1"
              style={{ color: 'var(--auth-navy)' }}
            >
              Sign in
            </h2>
            <p style={{ color: 'var(--auth-slate)' }} className="text-sm">
              Enter your email to continue
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mt-6 p-4 rounded-xl border auth-animate-scale-in"
              style={{
                background: '#fef2f2',
                borderColor: '#fecaca',
              }}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-red-800">{error}</p>
                  {showRegisterPrompt && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-xs text-red-600 mb-2.5">
                        Don&apos;t have an account yet?
                      </p>
                      <button
                        onClick={handleRegisterRedirect}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors duration-200"
                        style={{
                          background: 'var(--auth-navy)',
                          color: 'white',
                        }}
                      >
                        Create Account
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="auth-animate-fade-up auth-stagger-2">
              <label
                htmlFor="email"
                className="block text-xs font-medium uppercase tracking-wider mb-2"
                style={{ color: 'var(--auth-slate)' }}
              >
                Email address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      stroke: focused ? 'var(--auth-gold)' : 'var(--auth-slate)',
                      transition: 'stroke 0.2s ease-out',
                    }}
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  className="block w-full pl-12 pr-4 py-3.5 rounded-xl text-sm transition-all duration-200 outline-none"
                  style={{
                    background: 'white',
                    border: focused
                      ? '1.5px solid var(--auth-gold)'
                      : '1.5px solid #e2e8f0',
                    color: 'var(--auth-navy)',
                    boxShadow: focused
                      ? '0 0 0 3px rgba(201,168,76,0.1)'
                      : '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="auth-animate-fade-up auth-stagger-3">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-semibold rounded-xl cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading
                    ? 'var(--auth-navy-light)'
                    : 'linear-gradient(135deg, var(--auth-navy) 0%, var(--auth-blue) 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(12,25,41,0.3)',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(12,25,41,0.4)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(12,25,41,0.3)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Continue
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="auth-animate-fade-up auth-stagger-4 flex items-center gap-3 pt-2">
              <div className="h-px flex-1" style={{ background: '#e2e8f0' }} />
              <span className="text-xs" style={{ color: 'var(--auth-slate)' }}>
                New here?
              </span>
              <div className="h-px flex-1" style={{ background: '#e2e8f0' }} />
            </div>

            {/* Register link */}
            <div className="auth-animate-fade-up auth-stagger-5">
              <Link
                href="/register"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200"
                style={{
                  background: 'transparent',
                  border: '1.5px solid #e2e8f0',
                  color: 'var(--auth-navy)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--auth-gold)'
                  e.currentTarget.style.color = 'var(--auth-gold-muted)'
                  e.currentTarget.style.background = 'rgba(201,168,76,0.04)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.color = 'var(--auth-navy)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Create an account
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </Link>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-10 auth-animate-fade-in auth-stagger-6">
            <p className="text-center text-xs" style={{ color: '#94a3b8' }}>
              By signing in, you agree to our church guidelines
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
