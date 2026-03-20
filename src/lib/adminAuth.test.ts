import test from 'node:test'
import assert from 'node:assert/strict'
import type { NextRequest } from 'next/server'
import { clearAllRateLimits } from './rateLimit'

const TEST_SECRET = 'test-secret-key'
process.env.JWT_SECRET = process.env.JWT_SECRET || TEST_SECRET
process.env.NODE_ENV = 'test'

async function loadAuth() {
  return import('./auth')
}

async function loadAdminAuth() {
  return import('./adminAuth')
}

function makeRequest(token?: string): NextRequest {
  return {
    cookies: {
      get(name: string) {
        if (name !== 'auth-token' || !token) return undefined
        return { name, value: token }
      }
    }
  } as unknown as NextRequest
}

test('verifyAdminFromRequest rejects requests without auth token', async () => {
  await clearAllRateLimits()
  const { verifyAdminFromRequest } = await loadAdminAuth()

  const result = await verifyAdminFromRequest(makeRequest())

  assert.equal(result.success, false)
  if (!result.success) {
    assert.equal(result.status, 401)
    assert.equal(result.error, 'Unauthorized')
  }
})

test('verifyAdminFromRequest rejects non-admin users', async () => {
  await clearAllRateLimits()
  const { signToken } = await loadAuth()
  const { verifyAdminFromRequest } = await loadAdminAuth()
  const token = signToken({ userId: 'user-1', email: 'user@example.com', role: 'USER' })

  const result = await verifyAdminFromRequest(makeRequest(token))

  assert.equal(result.success, false)
  if (!result.success) {
    assert.equal(result.status, 401)
    assert.equal(result.error, 'Unauthorized')
  }
})

test('verifyAdminFromRequest accepts admin users', async () => {
  await clearAllRateLimits()
  const { signToken } = await loadAuth()
  const { verifyAdminFromRequest } = await loadAdminAuth()
  const token = signToken({ userId: 'admin-1', email: 'admin@example.com', role: 'ADMIN' })

  const result = await verifyAdminFromRequest(makeRequest(token))

  assert.equal(result.success, true)
  if (result.success) {
    assert.equal(result.userId, 'admin-1')
    assert.equal(result.payload.role, 'ADMIN')
    assert.equal(result.payload.email, 'admin@example.com')
  }
})

test('verifyAdminFromRequest enforces admin rate limiting', async () => {
  await clearAllRateLimits()
  const { signToken } = await loadAuth()
  const { verifyAdminFromRequest } = await loadAdminAuth()
  const token = signToken({ userId: 'admin-rate', email: 'admin-rate@example.com', role: 'ADMIN' })

  for (let i = 0; i < 100; i += 1) {
    const result = await verifyAdminFromRequest(makeRequest(token))
    assert.equal(result.success, true)
  }

  const blocked = await verifyAdminFromRequest(makeRequest(token))
  assert.equal(blocked.success, false)
  if (!blocked.success) {
    assert.equal(blocked.status, 429)
    assert.match(blocked.error, /Too many attempts/i)
  }
})
