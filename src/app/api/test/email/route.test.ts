import test from 'node:test'
import assert from 'node:assert/strict'
import type { NextRequest } from 'next/server'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/ceireland_test'

function makeRequest(body: unknown, token?: string): NextRequest {
  return {
    url: 'http://localhost/api/test/email',
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

test('legacy test email route rejects unauthenticated requests', async () => {
  const { clearAllRateLimits } = await import('../../../../lib/rateLimit.ts')
  const { POST } = await import('./route')
  clearAllRateLimits()

  const response = await POST(makeRequest({ recipientEmail: 'member@example.com' }))
  const payload = await response.json()

  assert.equal(response.status, 401)
  assert.equal(payload.error, 'Unauthorized')
})

test('legacy test email route validates email payloads', async () => {
  const { clearAllRateLimits } = await import('../../../../lib/rateLimit.ts')
  const authModule = await import('../../../../lib/auth.ts')
  const auth = (authModule.default ?? authModule) as { signToken: (payload: { userId: string; email: string; role: string }) => string }
  const { POST } = await import('./route')
  clearAllRateLimits()

  const token = auth.signToken({ userId: 'admin-1', email: 'admin@example.com', role: 'ADMIN' })
  const response = await POST(makeRequest({ recipientEmail: 'invalid-email' }, token))
  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.code, 'VALIDATION_ERROR')
})
