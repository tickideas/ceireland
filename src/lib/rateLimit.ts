/**
 * Database-backed rate limiter for consistent behavior across instances.
 * Falls back to in-memory storage in test mode or when DB access is unavailable.
 */

import { Prisma } from '@prisma/client'
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

const SERIALIZABLE_RETRY_LIMIT = 3

function isRetryableSerializationError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2034'
  }
  return false
}

async function checkRateLimitInDatabase(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = normalizeKey(identifier)

  for (let attempt = 0; attempt < SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
    const now = Date.now()
    const resetTime = new Date(now + config.windowMs)

    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.rateLimitRecord.findUnique({
          where: { key },
          select: { count: true, resetTime: true },
        })

        if (!existing || existing.resetTime.getTime() < now) {
          await tx.rateLimitRecord.upsert({
            where: { key },
            create: {
              key,
              count: 1,
              resetTime,
            },
            update: {
              count: 1,
              resetTime,
            },
          })

          return {
            success: true,
            remaining: config.maxAttempts - 1,
            resetTime: resetTime.getTime(),
          }
        }

        if (existing.count >= config.maxAttempts) {
          return buildExceededResult(existing.resetTime.getTime())
        }

        const updated = await tx.rateLimitRecord.update({
          where: { key },
          data: { count: { increment: 1 } },
          select: { count: true, resetTime: true },
        })

        return {
          success: true,
          remaining: config.maxAttempts - updated.count,
          resetTime: updated.resetTime.getTime(),
        }
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (isRetryableSerializationError(error) && attempt < SERIALIZABLE_RETRY_LIMIT - 1) {
        continue
      }
      throw error
    }
  }

  throw new Error('Rate limit transaction failed after retries') // unreachable - satisfies TypeScript control flow
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
    console.warn('[RateLimit] Falling back to in-memory store:', error instanceof Error ? error.message : error)
    return checkRateLimitInMemory(identifier, config)
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
