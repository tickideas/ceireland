import test from 'node:test'
import assert from 'node:assert/strict'
import type { NextRequest } from 'next/server'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/ceireland_test'

function makeRequest(body?: unknown, token?: string): NextRequest {
  return {
    url: 'http://localhost/api/admin/service-settings',
    async json() {
      return body
    },
    cookies: {
      get(name: string) {
        if (name !== 'auth-token' || !token) return undefined
        return { name, value: token }
      }
    }
  } as unknown as NextRequest
}

test('admin service settings route rejects unauthenticated updates', async () => {
  const { clearAllRateLimits } = await import('../../../../lib/rateLimit.ts')
  const { PUT } = await import('./route')
  await clearAllRateLimits()

  const response = await PUT(makeRequest({ appName: 'Church App' }))
  const payload = await response.json()

  assert.equal(response.status, 401)
  assert.equal(payload.error, 'Unauthorized')
})

test('admin service settings route validates payloads', async () => {
  const { clearAllRateLimits } = await import('../../../../lib/rateLimit.ts')
  const authModule = await import('../../../../lib/auth.ts')
  const auth = (authModule.default ?? authModule) as { signToken: (payload: { userId: string; email: string; role: string }) => string }
  const { PUT } = await import('./route')
  await clearAllRateLimits()

  const token = auth.signToken({ userId: 'admin-1', email: 'admin@example.com', role: 'ADMIN' })
  const response = await PUT(makeRequest({ authLogoUrl: 'notaurl' }, token))
  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.code, 'VALIDATION_ERROR')
})

test('admin prayer request update returns 404 when record is missing', async () => {
  const { clearAllRateLimits } = await import('../../../../lib/rateLimit.ts')
  const { prisma } = await import('../../../../lib/prisma.ts')
  const authModule = await import('../../../../lib/auth.ts')
  const auth = (authModule.default ?? authModule) as { signToken: (payload: { userId: string; email: string; role: string }) => string }
  const prayerRoute = await import('../prayer-requests/[id]/route')
  await clearAllRateLimits()

  const originalUpdate = prisma.prayerRequest.update
  prisma.prayerRequest.update = (async () => {
    const error = new Error('Record not found') as Error & { code?: string }
    error.code = 'P2025'
    throw error
  }) as typeof prisma.prayerRequest.update

  try {
    const token = auth.signToken({ userId: 'admin-1', email: 'admin@example.com', role: 'ADMIN' })
    const response = await prayerRoute.PATCH(makeRequest({ isRead: true }, token), {
      params: Promise.resolve({ id: 'missing-request' })
    })
    const payload = await response.json()

    assert.equal(response.status, 404)
    assert.equal(payload.code, 'NOT_FOUND')
    assert.equal(payload.error, 'Prayer request not found')
  } finally {
    prisma.prayerRequest.update = originalUpdate
  }
})

test('admin prayer request delete returns 404 when record is missing', async () => {
  const { clearAllRateLimits } = await import('../../../../lib/rateLimit.ts')
  const { prisma } = await import('../../../../lib/prisma.ts')
  const authModule = await import('../../../../lib/auth.ts')
  const auth = (authModule.default ?? authModule) as { signToken: (payload: { userId: string; email: string; role: string }) => string }
  const prayerRoute = await import('../prayer-requests/[id]/route')
  await clearAllRateLimits()

  const originalDelete = prisma.prayerRequest.delete
  prisma.prayerRequest.delete = (async () => {
    const error = new Error('Record not found') as Error & { code?: string }
    error.code = 'P2025'
    throw error
  }) as typeof prisma.prayerRequest.delete

  try {
    const token = auth.signToken({ userId: 'admin-1', email: 'admin@example.com', role: 'ADMIN' })
    const response = await prayerRoute.DELETE(makeRequest({}, token), {
      params: Promise.resolve({ id: 'missing-request' })
    })
    const payload = await response.json()

    assert.equal(response.status, 404)
    assert.equal(payload.code, 'NOT_FOUND')
    assert.equal(payload.error, 'Prayer request not found')
  } finally {
    prisma.prayerRequest.delete = originalDelete
  }
})

test('admin salvation response update returns 404 when record is missing', async () => {
  const { clearAllRateLimits } = await import('../../../../lib/rateLimit.ts')
  const { prisma } = await import('../../../../lib/prisma.ts')
  const authModule = await import('../../../../lib/auth.ts')
  const auth = (authModule.default ?? authModule) as { signToken: (payload: { userId: string; email: string; role: string }) => string }
  const salvationRoute = await import('../salvation-responses/[id]/route')
  await clearAllRateLimits()

  const originalUpdate = prisma.salvationResponse.update
  prisma.salvationResponse.update = (async () => {
    const error = new Error('Record not found') as Error & { code?: string }
    error.code = 'P2025'
    throw error
  }) as typeof prisma.salvationResponse.update

  try {
    const token = auth.signToken({ userId: 'admin-1', email: 'admin@example.com', role: 'ADMIN' })
    const response = await salvationRoute.PATCH(makeRequest({ followedUp: true }, token), {
      params: Promise.resolve({ id: 'missing-response' })
    })
    const payload = await response.json()

    assert.equal(response.status, 404)
    assert.equal(payload.code, 'NOT_FOUND')
    assert.equal(payload.error, 'Salvation response not found')
  } finally {
    prisma.salvationResponse.update = originalUpdate
  }
})

test('admin salvation response delete returns 404 when record is missing', async () => {
  const { clearAllRateLimits } = await import('../../../../lib/rateLimit.ts')
  const { prisma } = await import('../../../../lib/prisma.ts')
  const authModule = await import('../../../../lib/auth.ts')
  const auth = (authModule.default ?? authModule) as { signToken: (payload: { userId: string; email: string; role: string }) => string }
  const salvationRoute = await import('../salvation-responses/[id]/route')
  await clearAllRateLimits()

  const originalDelete = prisma.salvationResponse.delete
  prisma.salvationResponse.delete = (async () => {
    const error = new Error('Record not found') as Error & { code?: string }
    error.code = 'P2025'
    throw error
  }) as typeof prisma.salvationResponse.delete

  try {
    const token = auth.signToken({ userId: 'admin-1', email: 'admin@example.com', role: 'ADMIN' })
    const response = await salvationRoute.DELETE(makeRequest({}, token), {
      params: Promise.resolve({ id: 'missing-response' })
    })
    const payload = await response.json()

    assert.equal(response.status, 404)
    assert.equal(payload.code, 'NOT_FOUND')
    assert.equal(payload.error, 'Salvation response not found')
  } finally {
    prisma.salvationResponse.delete = originalDelete
  }
})
