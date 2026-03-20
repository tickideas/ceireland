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
