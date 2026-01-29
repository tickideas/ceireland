'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RegisterPageContentProps {
  initialAppName: string
  initialBgUrl: string | null
  initialLogoUrl: string | null
  initialWelcomeHeading: string
  initialTagline: string
  initialFooterText: string
}

export default function RegisterPageContent({ initialAppName, initialBgUrl, initialLogoUrl, initialWelcomeHeading, initialTagline, initialFooterText }: RegisterPageContentProps) {
  const [formData, setFormData] = useState({
    title: '',
    name: '',
    lastName: '',
    email: '',
    phone: '',
    honeypot: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        setTimeout(() => router.push('/login'), 3000)
      } else {
        setError(data.error)
      }
    } catch {
      setError('An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  const inputClasses = (fieldName: string) => {
    const isFocused = focusedField === fieldName
    return {
      className: 'block w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none',
      style: {
        background: 'white',
        border: isFocused
          ? '1.5px solid var(--auth-gold)'
          : '1.5px solid #e2e8f0',
        color: 'var(--auth-navy)',
        boxShadow: isFocused
          ? '0 0 0 3px rgba(201,168,76,0.1)'
          : '0 1px 2px rgba(0,0,0,0.04)',
      } as React.CSSProperties,
      onFocus: () => setFocusedField(fieldName),
      onBlur: () => setFocusedField(null),
    }
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
        {initialBgUrl && (
          <div className="absolute inset-0 bg-[var(--auth-navy)]/80" />
        )}

        {/* Abstract decorative elements */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full auth-animate-float"
            style={{
              background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full auth-animate-float"
            style={{
              background: 'radial-gradient(circle, rgba(30,58,95,0.4) 0%, transparent 70%)',
              animationDelay: '3s',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
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
            </div>
          </div>

          <div className="space-y-6">
            <div className="auth-animate-fade-up auth-stagger-2">
              <div className="auth-shimmer h-0.5 w-16 rounded-full mb-8" />
              <h1
                className="text-4xl xl:text-5xl leading-tight text-white font-[var(--font-dm-serif)]"
              >
                Join<br />
                <span style={{ color: 'var(--auth-gold)' }}>{initialWelcomeHeading}</span>
              </h1>
            </div>
            <p className="text-white/50 text-lg max-w-md leading-relaxed auth-animate-fade-up auth-stagger-3">
              {initialTagline}
            </p>
          </div>

          <div className="auth-animate-fade-up auth-stagger-4">
            <div className="flex items-center gap-4 text-white/30 text-sm">
              <div className="h-px flex-1 bg-white/10" />
              <span className="tracking-widest uppercase text-xs">{initialFooterText}</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Right Panel: Registration Form ===== */}
      <div
        className="flex-1 flex items-center justify-center relative"
        style={{ background: 'var(--auth-cream)' }}
      >
        {initialBgUrl && (
          <>
            <div
              className="lg:hidden absolute inset-0"
              style={{ backgroundImage: `url(${initialBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div className="lg:hidden absolute inset-0 bg-[var(--auth-cream)]/95" />
          </>
        )}

        <div
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, var(--auth-navy) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 w-full max-w-lg px-6 sm:px-10 py-10">
          {/* Mobile header */}
          <div className="lg:hidden mb-8 auth-animate-fade-up">
            <div className="flex items-center gap-3 mb-5">
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
            </div>
            <h1
              className="text-3xl font-[var(--font-dm-serif)]"
              style={{ color: 'var(--auth-navy)' }}
            >
              Join<br />
              <span style={{ color: 'var(--auth-gold-muted)' }}>{initialWelcomeHeading}</span>
            </h1>
          </div>

          {/* Form header */}
          <div className="auth-animate-fade-up auth-stagger-1">
            <h2
              className="text-2xl font-semibold mb-1"
              style={{ color: 'var(--auth-navy)' }}
            >
              Create your account
            </h2>
            <p style={{ color: 'var(--auth-slate)' }} className="text-sm">
              Fill in your details to get started
            </p>
          </div>

          {/* Success message */}
          {message && (
            <div
              className="mt-5 p-4 rounded-xl border auth-animate-scale-in"
              style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <p className="text-sm text-green-800">{message}</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              className="mt-5 p-4 rounded-xl border auth-animate-scale-in"
              style={{ background: '#fef2f2', borderColor: '#fecaca' }}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            {/* Title */}
            <div className="auth-animate-fade-up auth-stagger-2">
              <label htmlFor="title" className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--auth-slate)' }}>
                Title
              </label>
              <select
                id="title"
                required
                {...inputClasses('title')}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              >
                <option value="">Select Title</option>
                <option value="Bro.">Bro.</option>
                <option value="Sis.">Sis.</option>
                <option value="Dcn.">Dcn.</option>
                <option value="Dcns.">Dcns.</option>
                <option value="Dr.">Dr.</option>
                <option value="Gov.">Gov.</option>
                <option value="Pastor">Pastor</option>
              </select>
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 auth-animate-fade-up auth-stagger-3">
              <div>
                <label htmlFor="name" className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--auth-slate)' }}>
                  First Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  {...inputClasses('name')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--auth-slate)' }}>
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  {...inputClasses('lastName')}
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div className="auth-animate-fade-up auth-stagger-4">
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--auth-slate)' }}>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      stroke: focusedField === 'email' ? 'var(--auth-gold)' : 'var(--auth-slate)',
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
                  className="block w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
                  style={{
                    background: 'white',
                    border: focusedField === 'email'
                      ? '1.5px solid var(--auth-gold)'
                      : '1.5px solid #e2e8f0',
                    color: 'var(--auth-navy)',
                    boxShadow: focusedField === 'email'
                      ? '0 0 0 3px rgba(201,168,76,0.1)'
                      : '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="auth-animate-fade-up auth-stagger-5">
              <label htmlFor="phone" className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--auth-slate)' }}>
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      stroke: focusedField === 'phone' ? 'var(--auth-gold)' : 'var(--auth-slate)',
                      transition: 'stroke 0.2s ease-out',
                    }}
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <input
                  id="phone"
                  type="tel"
                  required
                  className="block w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
                  style={{
                    background: 'white',
                    border: focusedField === 'phone'
                      ? '1.5px solid var(--auth-gold)'
                      : '1.5px solid #e2e8f0',
                    color: 'var(--auth-navy)',
                    boxShadow: focusedField === 'phone'
                      ? '0 0 0 3px rgba(201,168,76,0.1)'
                      : '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="+353 1234567"
                />
              </div>
            </div>

            {/* Honeypot field - hidden from users */}
            <input
              type="text"
              name="honeypot"
              className="hidden"
              value={formData.honeypot}
              onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Submit */}
            <div className="auth-animate-fade-up auth-stagger-6 pt-1">
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
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
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
            <div className="flex items-center gap-3 pt-1">
              <div className="h-px flex-1" style={{ background: '#e2e8f0' }} />
              <span className="text-xs" style={{ color: 'var(--auth-slate)' }}>
                Already a member?
              </span>
              <div className="h-px flex-1" style={{ background: '#e2e8f0' }} />
            </div>

            {/* Sign in link */}
            <div>
              <Link
                href="/login"
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
                Sign in instead
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </Link>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8">
            <p className="text-center text-xs" style={{ color: '#94a3b8' }}>
              By registering, you agree to our community guidelines
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
