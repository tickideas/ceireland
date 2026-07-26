/**
 * Database-backed rate limiter for consistent behavior across instances.
 * Uses in-memory storage only in test mode or when explicitly configured.
 */

import { prisma } from './prisma'

interface RateLimitEntry {
  count: number
  resetTime: number
}

const inMemoryStore = new Map<string, RateLimitEntry>()

const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of inMemoryStore.entries()) {
    if (entry.resetTime < now) {
      inMemoryStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

cleanupInterval.unref?.()

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

export const RATE_LIMITS = {
  LOGIN: { maxAttempts: 10, windowMs: 15 * 60 * 1000 },
  REGISTER: { maxAttempts: 5, windowMs: 60 * 60 * 1000 },

  // Email-keyed limits alone are trivially bypassed: the attacker chooses the
  // email, so every new address resets the counter. These IP-keyed limits are
  // the ones that actually bound how many verification emails a single source
  // can trigger. Ceilings are deliberately generous so shared/NAT'd church
  // connections are not locked out.
  LOGIN_IP: { maxAttempts: 30, windowMs: 15 * 60 * 1000 },
  REGISTER_IP: { maxAttempts: 10, windowMs: 60 * 60 * 1000 },
  RESEND_VERIFICATION_IP: { maxAttempts: 5, windowMs: 60 * 60 * 1000 },

  // Site-wide circuit breaker. Normal signup volume is far below this; it only
  // trips during a flood, where halting signups beats relaying spam from our
  // sending domain.
  REGISTER_GLOBAL: { maxAttempts: 200, windowMs: 60 * 60 * 1000 },

  API_GENERAL: { maxAttempts: 1000, windowMs: 15 * 60 * 1000 },
  ADMIN: { maxAttempts: 100, windowMs: 15 * 60 * 1000 },
  PRAYER_REQUEST: { maxAttempts: 5, windowMs: 60 * 60 * 1000 },
  SALVATION: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
} as const

function normalizeKey(identifier: string): string {
  return identifier.toLowerCase().trim()
}

function buildExceededResult(resetTime: number): RateLimitResult {
  const minutesRemaining = Math.ceil((resetTime - Date.now()) / 60000)
  return {
    success: false,
    remaining: 0,
    resetTime,
    error: `Too many attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`,
  }
}

function shouldUseInMemoryFallback(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.RATE_LIMIT_STORE === 'memory'
}

function checkRateLimitInMemory(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = normalizeKey(identifier)
  const now = Date.now()
  const entry = inMemoryStore.get(key)

  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs
    inMemoryStore.set(key, {
      count: 1,
      resetTime,
    })
    return {
      success: true,
      remaining: config.maxAttempts - 1,
      resetTime,
    }
  }

  if (entry.count >= config.maxAttempts) {
    return buildExceededResult(entry.resetTime)
  }

  entry.count += 1
  inMemoryStore.set(key, entry)

  return {
    success: true,
    remaining: config.maxAttempts - entry.count,
    resetTime: entry.resetTime,
  }
}

/** Expired rows are pruned at most this often, per process. */
const PRUNE_MIN_INTERVAL_MS = 10 * 60 * 1000
/** Bounded so a large backlog is drained over several passes, not one long lock. */
const PRUNE_BATCH_SIZE = 10_000

let lastPruneAt = 0

/**
 * Deletes expired records opportunistically.
 *
 * Nothing previously removed them, so the table grew without bound in normal
 * operation and accumulated one row per address during the signup flood.
 */
async function pruneExpiredRecords(): Promise<void> {
  const now = Date.now()
  if (now - lastPruneAt < PRUNE_MIN_INTERVAL_MS) return
  lastPruneAt = now

  try {
    await prisma.$executeRaw`
      DELETE FROM "rate_limit_records"
      WHERE "key" IN (
        SELECT "key" FROM "rate_limit_records"
        WHERE "resetTime" < now()
        LIMIT ${PRUNE_BATCH_SIZE}
      )
    `
  } catch (error) {
    console.warn('[RateLimit] prune failed:', error instanceof Error ? error.message : error)
  }
}

/**
 * Applies the limit in a single atomic statement.
 *
 * This was a Serializable transaction, which aborted constantly with
 * "could not serialize access" under concurrency - exactly when the limiter
 * matters most, and every abort fell through to the weaker in-memory path.
 * INSERT ... ON CONFLICT DO UPDATE is atomic by itself at the default
 * isolation level, so concurrent callers queue on the row lock instead of
 * cancelling one another.
 *
 * The counter stops climbing at maxAttempts + 1: bounded under a sustained
 * attack, while keeping "over the limit" distinguishable from "exactly at it".
 */
async function checkRateLimitInDatabase(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = normalizeKey(identifier)
  const resetTime = new Date(Date.now() + config.windowMs)

  const rows = await prisma.$queryRaw<Array<{ count: number; resetTime: Date }>>`
    INSERT INTO "rate_limit_records" ("key", "count", "resetTime", "createdAt", "updatedAt")
    VALUES (${key}, 1, ${resetTime}, now(), now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limit_records"."resetTime" < now() THEN 1
        WHEN "rate_limit_records"."count" <= ${config.maxAttempts} THEN "rate_limit_records"."count" + 1
        ELSE "rate_limit_records"."count"
      END,
      "resetTime" = CASE
        WHEN "rate_limit_records"."resetTime" < now() THEN ${resetTime}
        ELSE "rate_limit_records"."resetTime"
      END,
      "updatedAt" = now()
    RETURNING "count", "resetTime"
  `

  const record = rows[0]
  if (!record) {
    throw new Error('Rate limit upsert returned no row')
  }

  void pruneExpiredRecords()

  if (record.count > config.maxAttempts) {
    return buildExceededResult(record.resetTime.getTime())
  }

  return {
    success: true,
    remaining: config.maxAttempts - record.count,
    resetTime: record.resetTime.getTime(),
  }
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (shouldUseInMemoryFallback()) {
    return checkRateLimitInMemory(identifier, config)
  }

  try {
    return await checkRateLimitInDatabase(identifier, config)
  } catch (error) {
    // Fail closed. The previous in-memory fallback was per-process and reset on
    // every deploy, so it quietly weakened the limit precisely when the database
    // was struggling under an attack. Every endpoint guarded here needs the
    // database to do its real work, so denying costs no genuine availability.
    console.error(
      '[RateLimit] store unavailable, denying request:',
      error instanceof Error ? error.message : error
    )
    return {
      success: false,
      remaining: 0,
      resetTime: Date.now() + config.windowMs,
      error: 'Service temporarily unavailable. Please try again shortly.',
    }
  }
}

async function resetRateLimitInDatabase(identifier: string): Promise<void> {
  const key = normalizeKey(identifier)
  await prisma.rateLimitRecord.deleteMany({ where: { key } })
}

export async function resetRateLimit(identifier: string): Promise<void> {
  const key = normalizeKey(identifier)
  inMemoryStore.delete(key)

  if (shouldUseInMemoryFallback()) {
    return
  }

  try {
    await resetRateLimitInDatabase(key)
  } catch (error) {
    console.warn('[RateLimit] Failed to reset DB record:', error instanceof Error ? error.message : error)
  }
}

function getRateLimitStatusInMemory(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = normalizeKey(identifier)
  const now = Date.now()
  const entry = inMemoryStore.get(key)

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

async function getRateLimitStatusInDatabase(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = normalizeKey(identifier)
  const now = Date.now()
  const entry = await prisma.rateLimitRecord.findUnique({
    where: { key },
    select: { count: true, resetTime: true },
  })

  if (!entry || entry.resetTime.getTime() < now) {
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
    resetTime: entry.resetTime.getTime(),
    error: remaining === 0 ? 'Rate limit exceeded' : undefined,
  }
}

export async function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (shouldUseInMemoryFallback()) {
    return getRateLimitStatusInMemory(identifier, config)
  }

  try {
    return await getRateLimitStatusInDatabase(identifier, config)
  } catch (error) {
    console.warn('[RateLimit] Falling back to in-memory status:', error instanceof Error ? error.message : error)
    return getRateLimitStatusInMemory(identifier, config)
  }
}

export async function clearAllRateLimits(): Promise<void> {
  inMemoryStore.clear()

  if (shouldUseInMemoryFallback()) {
    return
  }

  try {
    await prisma.rateLimitRecord.deleteMany()
  } catch (error) {
    console.warn('[RateLimit] Failed to clear DB records:', error instanceof Error ? error.message : error)
  }
}

export async function getRateLimitStoreSize(): Promise<number> {
  if (shouldUseInMemoryFallback()) {
    return inMemoryStore.size
  }

  try {
    return await prisma.rateLimitRecord.count()
  } catch (error) {
    console.warn('[RateLimit] Falling back to in-memory size:', error instanceof Error ? error.message : error)
    return inMemoryStore.size
  }
}
