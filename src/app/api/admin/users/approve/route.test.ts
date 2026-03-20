import test from 'node:test'
import assert from 'node:assert/strict'
import type { NextRequest } from 'next/server'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/ceireland_test'

function makeRequest(body: unknown, token?: string): NextRequest {
  return {
    url: 'http://localhost/api/admin/users/approve',
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

test('admin user approval route rejects unauthenticated requests', async () => {
  const { clearAllRateLimits } = await import('../../../../../lib/rateLimit.ts')
  const { PATCH } = await import('./route')
  await clearAllRateLimits()

  const response = await PATCH(makeRequest({ userId: 'user-1', approved: true }))
  const payload = await response.json()

  assert.equal(response.status, 401)
  assert.equal(payload.error, 'Unauthorized')
})

test('admin user approval route validates request payloads', async () => {
  const { clearAllRateLimits } = await import('../../../../../lib/rateLimit.ts')
  const authModule = await import('../../../../../lib/auth.ts')
  const auth = (authModule.default ?? authModule) as { signToken: (payload: { userId: string; email: string; role: string }) => string }
  const { PATCH } = await import('./route')
  await clearAllRateLimits()

  const token = auth.signToken({ userId: 'admin-1', email: 'admin@example.com', role: 'ADMIN' })
  const response = await PATCH(makeRequest({ userId: '', approved: 'yes' }, token))
  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.code, 'VALIDATION_ERROR')
})

test('admin user update returns 404 when member is missing', async () => {
  const { clearAllRateLimits } = await import('../../../../../lib/rateLimit.ts')
  const { prisma } = await import('../../../../../lib/prisma.ts')
  const authModule = await import('../../../../../lib/auth.ts')
  const auth = (authModule.default ?? authModule) as { signToken: (payload: { userId: string; email: string; role: string }) => string }
  const userRoute = await import('../[id]/route')
  await clearAllRateLimits()

  const originalUpdate = prisma.user.update
  prisma.user.update = (async () => {
    const error = new Error('Record not found') as Error & { code?: string }
    error.code = 'P2025'
    throw error
  }) as typeof prisma.user.update

  try {
    const token = auth.signToken({ userId: 'admin-1', email: 'admin@example.com', role: 'ADMIN' })
    const response = await userRoute.PATCH(makeRequest({ name: 'Updated' }, token), {
      params: Promise.resolve({ id: 'missing-user' })
    })
    const payload = await response.json()

    assert.equal(response.status, 404)
    assert.equal(payload.code, 'NOT_FOUND')
    assert.equal(payload.error, 'Member not found')
  } finally {
    prisma.user.update = originalUpdate
  }
})
