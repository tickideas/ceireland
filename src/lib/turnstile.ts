/**
 * Cloudflare Turnstile verification.
 *
 * Turnstile is only enforced when TURNSTILE_SECRET_KEY is set, so local
 * development and tests run without it. Configure both of these in production:
 *
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY  - rendered by the browser widget
 *   TURNSTILE_SECRET_KEY            - server-side verification, never exposed
 *
 * Tokens are single-use and short-lived: a token that has already been
 * redeemed comes back as `timeout-or-duplicate`, so the client widget must be
 * reset after every failed submission.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const VERIFY_TIMEOUT_MS = 10_000

interface SiteVerifyResponse {
  success: boolean
  'error-codes'?: string[]
}

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY)
}

export interface TurnstileResult {
  success: boolean
  error?: string
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // Not configured: treated as disabled by callers, which check
    // isTurnstileConfigured() first.
    return { success: true }
  }

  if (!token) {
    return { success: false, error: 'Please complete the verification challenge' }
  }

  const body = new URLSearchParams({ secret, response: token })
  // Cloudflare rejects the placeholder used when a real address is unavailable,
  // so only send a genuine one.
  if (remoteIp && remoteIp !== 'unknown') {
    body.set('remoteip', remoteIp)
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    })

    if (!response.ok) {
      console.error('[Turnstile] siteverify returned', response.status)
      return { success: false, error: 'Verification unavailable. Please try again.' }
    }

    const result = (await response.json()) as SiteVerifyResponse
    if (result.success) {
      return { success: true }
    }

    const codes = result['error-codes'] ?? []
    console.warn('[Turnstile] verification rejected:', codes.join(', ') || 'no error code')

    if (codes.includes('timeout-or-duplicate')) {
      return { success: false, error: 'Verification expired. Please try again.' }
    }
    return { success: false, error: 'Verification failed. Please try again.' }
  } catch (error) {
    // Network failure or timeout. Fail closed: this endpoint sends mail to
    // arbitrary addresses, so an unverifiable request must not proceed.
    console.error('[Turnstile] verification error:', error instanceof Error ? error.message : error)
    return { success: false, error: 'Verification unavailable. Please try again.' }
  }
}
