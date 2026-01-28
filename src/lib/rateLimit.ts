/**
 * Simple in-memory rate limiter
 * Suitable for 250-500 users with reasonable limits for church applications
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
  error?: string
}

/**
 * Church-friendly rate limits:
 * - Login: 10 attempts per 15 minutes (allows for typos, multiple family members)
 * - Register: 5 attempts per hour (prevents spam, allows retries)
 * - API: 1000 requests per 15 minutes (very generous for normal usage)
 * 
 * These limits accommodate Sunday/Wednesday service spikes when many people log in at once
 */
export const RATE_LIMITS = {
  LOGIN: { maxAttempts: 10, windowMs: 15 * 60 * 1000 }, // 10 per 15 minutes
  REGISTER: { maxAttempts: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  API_GENERAL: { maxAttempts: 1000, windowMs: 15 * 60 * 1000 }, // 1000 per 15 minutes
  ADMIN: { maxAttempts: 100, windowMs: 15 * 60 * 1000 }, // 100 per 15 minutes for admin actions
  PRAYER_REQUEST: { maxAttempts: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour per IP
  SALVATION: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour per IP
} as const

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., email, IP address, userId)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with success status and remaining attempts
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = identifier.toLowerCase().trim()
  const now = Date.now()
  
  const entry = store.get(key)

  // No entry or entry expired - create new one
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs
    store.set(key, {
      count: 1,
      resetTime,
    })
    return {
      success: true,
      remaining: config.maxAttempts - 1,
      resetTime,
    }
  }

  // Entry exists and is still valid
  if (entry.count >= config.maxAttempts) {
    // Rate limit exceeded
    const minutesRemaining = Math.ceil((entry.resetTime - now) / 60000)
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      error: `Too many attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`,
    }
  }

  // Increment count
  entry.count += 1
  store.set(key, entry)

  return {
    success: true,
    remaining: config.maxAttempts - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Reset rate limit for a specific identifier
 * Useful for manual admin overrides or after successful operations
 */
export function resetRateLimit(identifier: string): void {
  const key = identifier.toLowerCase().trim()
  store.delete(key)
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = identifier.toLowerCase().trim()
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetTime < now) {
    return {
      success: true,
      remaining: config.maxAttempts,
      resetTime: now + config.windowMs,
    }
  }

  const remaining = Math.max(0, config.maxAttempts - entry.count)
  
  return {
    success: remaining > 0,
    remaining,
    resetTime: entry.resetTime,
    error: remaining === 0 ? 'Rate limit exceeded' : undefined,
  }
}

/**
 * Clear all rate limit entries
 * Useful for testing or manual resets
 */
export function clearAllRateLimits(): void {
  store.clear()
}

/**
 * Get store size for monitoring
 */
export function getRateLimitStoreSize(): number {
  return store.size
}
