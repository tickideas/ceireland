'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState('')

  const handleResend = async () => {
    if (!email) return
    setResendLoading(true)
    setResendMessage('')
    setResendError('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setResendMessage(data.message)
      } else {
        setResendError(data.error || 'Failed to resend verification email')
      }
    } catch {
      setResendError('An error occurred. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--auth-cream)' }}>
        <div className="max-w-md w-full text-center">
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-3" style={{ color: 'var(--auth-navy)' }}>
            Email Verified!
          </h1>
          <p className="mb-6" style={{ color: 'var(--auth-slate)' }}>
            Your email address has been successfully verified. You can now log in to your account.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, var(--auth-navy) 0%, var(--auth-blue) 100%)',
              color: 'white'
            }}
          >
            Go to Login
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    )
  }

  const errorMessages: Record<string, string> = {
    missing_token: 'The verification link is invalid.',
    expired: 'The verification link has expired.',
    invalid: 'The verification link is invalid or has already been used.',
    verification_failed: 'Email verification failed.',
    server_error: 'An error occurred. Please try again.'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--auth-cream)' }}>
      <div className="max-w-md w-full">
        {error && (
          <div className="text-center mb-8">
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-3" style={{ color: 'var(--auth-navy)' }}>
              Verification Failed
            </h1>
            <p className="mb-6" style={{ color: 'var(--auth-slate)' }}>
              {errorMessages[error] || 'The verification link is invalid or has expired.'}
            </p>
          </div>
        )}

        {!success && (
          <>
            <h2 className="text-xl font-semibold mb-4 text-center" style={{ color: 'var(--auth-navy)' }}>
              Didn&apos;t receive the email?
            </h2>
            <p className="text-sm mb-6 text-center" style={{ color: 'var(--auth-slate)' }}>
              Enter your email address and we&apos;ll send you a new verification link.
            </p>

            {resendMessage && (
              <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200">
                <p className="text-sm text-green-800">{resendMessage}</p>
              </div>
            )}

            {resendError && (
              <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-800">{resendError}</p>
              </div>
            )}

            <div className="space-y-4">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
                style={{
                  background: 'white',
                  border: '1.5px solid #e2e8f0',
                  color: 'var(--auth-navy)'
                }}
              />
              <button
                onClick={handleResend}
                disabled={resendLoading || !email}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--auth-navy) 0%, var(--auth-blue) 100%)',
                  color: 'white'
                }}
              >
                {resendLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </button>
            </div>

            <div className="mt-8 text-center">
              <Link href="/login" className="text-sm font-medium" style={{ color: 'var(--auth-blue)' }}>
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--auth-cream)' }}>
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
