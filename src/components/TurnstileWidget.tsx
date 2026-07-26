'use client'

import { useEffect, useRef } from 'react'

/**
 * Cloudflare Turnstile widget.
 *
 * Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset, so local
 * development and preview builds work without Cloudflare credentials. The
 * server applies the matching rule: it only enforces verification when
 * TURNSTILE_SECRET_KEY is present.
 *
 * Tokens are single-use. Bump `resetNonce` after a failed submission to issue
 * a fresh one, otherwise the next attempt is rejected as a duplicate.
 */

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'error-callback': () => void
      'expired-callback': () => void
      theme?: 'light' | 'dark' | 'auto'
    }
  ) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      // Allow a later attempt to retry rather than caching the failure.
      scriptPromise = null
      reject(new Error('Failed to load Turnstile'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
export const isTurnstileEnabled = Boolean(TURNSTILE_SITE_KEY)

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void
  resetNonce?: number
}

export function TurnstileWidget({ onToken, resetNonce = 0 }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  // Held in a ref so a new callback identity does not tear down the widget.
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return

    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => onTokenRef.current(token),
          'error-callback': () => onTokenRef.current(null),
          'expired-callback': () => onTokenRef.current(null),
          theme: 'light',
        })
      })
      .catch(() => {
        if (!cancelled) onTokenRef.current(null)
      })

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (resetNonce > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
    }
  }, [resetNonce])

  if (!TURNSTILE_SITE_KEY) return null

  return <div ref={containerRef} className="flex justify-center" />
}
