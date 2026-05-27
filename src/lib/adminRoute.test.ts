import test from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { clearAllRateLimits } from './rateLimit'

process.env.NODE_ENV = process.env.NODE_ENV || 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key'

async function loadAuth() {
  return import('./auth')
}

async function loadAdminRoute() {
  return import('./adminRoute')
}

function makeRequest(opts: {
  token?: string
  method?: string
  url?: string
  body?: unknown
} = {}): NextRequest {
  const { token, method = 'GET', url = 'http://localhost/api/admin/x', body } = opts
  const bodyText = body === undefined ? '' : JSON.stringify(body)
  return {
    method,
    url,
    cookies: {
      get(name: string) {
        if (name !== 'auth-token' || !token) return undefined
        return { name, value: token }
      },
    },
    text: async () => bodyText,
    json: async () => {
      if (!bodyText) {
        throw new SyntaxError('Empty body')
      }
      return JSON.parse(bodyText)
    },
  } as unknown as NextRequest
}

async function adminToken(role: 'ADMIN' | 'USER' = 'ADMIN') {
  const { signToken } = await loadAuth()
  return signToken({
    userId: role === 'ADMIN' ? 'admin-1' : 'user-1',
    email: `${role.toLowerCase()}@example.com`,
    role,
  })
}

test('adminRoute returns 401 with canonical error shape when no token', async () => {
  await clearAllRateLimits()
  const { adminRoute } = await loadAdminRoute()

  const handler = adminRoute({}, async () => ({ ok: true }))
  const res = await handler(makeRequest())

  assert.equal(res.status, 401)
  const body = await res.json()
  assert.equal(body.error, 'Unauthorized')
  assert.equal(body.code, 'AUTH_ERROR')
  assert.equal(body.statusCode, 401)
  assert.ok(body.timestamp, 'timestamp present')
})

test('adminRoute returns 401 for non-admin token', async () => {
  await clearAllRateLimits()
  const { adminRoute } = await loadAdminRoute()
  const token = await adminToken('USER')

  const handler = adminRoute({}, async () => ({ ok: true }))
  const res = await handler(makeRequest({ token }))

  assert.equal(res.status, 401)
  const body = await res.json()
  assert.equal(body.code, 'AUTH_ERROR')
})

test('adminRoute wraps plain return values as JSON', async () => {
  await clearAllRateLimits()
  const { adminRoute } = await loadAdminRoute()
  const token = await adminToken()

  const handler = adminRoute({}, async ({ user }) => ({ hello: user.userId }))
  const res = await handler(makeRequest({ token }))

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.deepEqual(body, { hello: 'admin-1' })
})

test('adminRoute passes through Response/NextResponse untouched', async () => {
  await clearAllRateLimits()
  const { adminRoute } = await loadAdminRoute()
  const token = await adminToken()

  const handler = adminRoute({}, async () =>
    new NextResponse('raw,csv,bytes\n', {
      status: 200,
      headers: { 'Content-Type': 'text/csv' },
    }),
  )
  const res = await handler(makeRequest({ token }))

  assert.equal(res.status, 200)
  assert.equal(res.headers.get('Content-Type'), 'text/csv')
  assert.equal(await res.text(), 'raw,csv,bytes\n')
})

test('adminRoute validates body and yields canonical 400 on failure', async () => {
  await clearAllRateLimits()
  const { adminRoute } = await loadAdminRoute()
  const token = await adminToken()

  const handler = adminRoute(
    { body: z.object({ name: z.string().min(1) }) },
    async ({ body }) => body,
  )
  const res = await handler(makeRequest({ token, method: 'POST', body: { name: '' } }))

  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.code, 'VALIDATION_ERROR')
})

test('adminRoute validates query and exposes typed values', async () => {
  await clearAllRateLimits()
  const { adminRoute } = await loadAdminRoute()
  const token = await adminToken()

  const handler = adminRoute(
    { query: z.object({ page: z.string().transform(Number) }) },
    async ({ query }) => ({ page: query.page * 2 }),
  )
  const res = await handler(
    makeRequest({ token, url: 'http://localhost/api/admin/x?page=5' }),
  )

  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { page: 10 })
})

test('adminRoute validates params from the Next route args', async () => {
  await clearAllRateLimits()
  const { adminRoute } = await loadAdminRoute()
  const token = await adminToken()

  const handler = adminRoute(
    { params: z.object({ id: z.string().min(1) }) },
    async ({ params }) => ({ id: params.id }),
  )
  const res = await handler(makeRequest({ token }), {
    params: Promise.resolve({ id: 'abc' }),
  })

  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { id: 'abc' })
})

test('adminRoute converts thrown AppError into canonical response', async () => {
  await clearAllRateLimits()
  const { adminRoute } = await loadAdminRoute()
  const { NotFoundError } = await import('./errors')
  const token = await adminToken()

  const handler = adminRoute({}, async () => {
    throw new NotFoundError('Member not found')
  })
  const res = await handler(makeRequest({ token }))

  assert.equal(res.status, 404)
  const body = await res.json()
  assert.equal(body.code, 'NOT_FOUND')
  assert.equal(body.error, 'Member not found')
})

test('adminRoute hides unknown errors behind a generic 500', async () => {
  await clearAllRateLimits()
  const { adminRoute } = await loadAdminRoute()
  const token = await adminToken()

  const handler = adminRoute({}, async () => {
    throw new Error('something internal leaked')
  })
  const res = await handler(makeRequest({ token }))

  assert.equal(res.status, 500)
  const body = await res.json()
  assert.equal(body.code, 'INTERNAL_ERROR')
  assert.notEqual(body.error, 'something internal leaked')
})

test('adminRoute maps Prisma P2025 to 404 NotFoundError fallback', async () => {
  await clearAllRateLimits()
  const { adminRoute } = await loadAdminRoute()
  const token = await adminToken()

  const handler = adminRoute({}, async () => {
    // Mimic Prisma's PrismaClientKnownRequestError shape for P2025.
    const err = Object.assign(new Error('No record found'), { code: 'P2025' })
    throw err
  })
  const res = await handler(makeRequest({ token }))

  assert.equal(res.status, 404)
  const body = await res.json()
  assert.equal(body.code, 'NOT_FOUND')
  assert.equal(body.error, 'Resource not found')
})

test('adminRoute lets per-route NotFoundError win over the P2025 fallback', async () => {
  await clearAllRateLimits()
  const { adminRoute } = await loadAdminRoute()
  const { NotFoundError } = await import('./errors')
  const token = await adminToken()

  const handler = adminRoute({}, async () => {
    try {
      const err = Object.assign(new Error('No record'), { code: 'P2025' })
      throw err
    } catch (e) {
      if ((e as { code?: string }).code === 'P2025') {
        throw new NotFoundError('Banner not found')
      }
      throw e
    }
  })
  const res = await handler(makeRequest({ token }))

  assert.equal(res.status, 404)
  const body = await res.json()
  assert.equal(body.code, 'NOT_FOUND')
  assert.equal(body.error, 'Banner not found')
})

test('adminRoute returns 400 on malformed JSON body', async () => {
  await clearAllRateLimits()
  const { adminRoute } = await loadAdminRoute()
  const token = await adminToken()

  const handler = adminRoute(
    { body: z.object({ name: z.string() }) },
    async ({ body }) => body,
  )
  const req = {
    ...makeRequest({ token, method: 'POST' }),
    json: async () => {
      throw new SyntaxError('Unexpected token')
    },
  } as unknown as NextRequest
  const res = await handler(req)

  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.code, 'VALIDATION_ERROR')
})
