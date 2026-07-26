import test from 'node:test'
import assert from 'node:assert/strict'
import { isTurnstileConfigured, verifyTurnstileToken } from './turnstile'

const originalFetch = globalThis.fetch
const originalSecret = process.env.TURNSTILE_SECRET_KEY

function restore() {
  globalThis.fetch = originalFetch
  if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY
  else process.env.TURNSTILE_SECRET_KEY = originalSecret
}

function stubFetch(handler: (url: string, init: RequestInit) => unknown) {
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const payload = handler(url, init)
    return { ok: true, status: 200, json: async () => payload } as Response
  }) as unknown as typeof fetch
}

test('isTurnstileConfigured reflects presence of the secret', () => {
  delete process.env.TURNSTILE_SECRET_KEY
  assert.equal(isTurnstileConfigured(), false)
  process.env.TURNSTILE_SECRET_KEY = 'secret'
  assert.equal(isTurnstileConfigured(), true)
  restore()
})

test('verifyTurnstileToken rejects a missing token when configured', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'secret'
  const result = await verifyTurnstileToken(undefined, '203.0.113.9')
  assert.equal(result.success, false)
  restore()
})

test('verifyTurnstileToken accepts a token Cloudflare approves', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'secret'
  stubFetch(() => ({ success: true }))
  const result = await verifyTurnstileToken('good-token', '203.0.113.9')
  assert.equal(result.success, true)
  restore()
})

test('verifyTurnstileToken surfaces a reusable-token rejection distinctly', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'secret'
  stubFetch(() => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }))
  const result = await verifyTurnstileToken('stale-token', '203.0.113.9')
  assert.equal(result.success, false)
  assert.match(result.error ?? '', /expired/i)
  restore()
})

test('verifyTurnstileToken omits the placeholder ip but sends a real one', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'secret'

  let sent = ''
  stubFetch((_url, init) => {
    sent = String(init.body)
    return { success: true }
  })

  await verifyTurnstileToken('t', 'unknown')
  assert.ok(!sent.includes('remoteip'), 'placeholder ip must not be sent')

  await verifyTurnstileToken('t', '203.0.113.9')
  assert.ok(sent.includes('remoteip=203.0.113.9'), 'real ip should be sent')

  restore()
})

test('verifyTurnstileToken fails closed when the network call throws', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'secret'
  globalThis.fetch = (async () => {
    throw new Error('network down')
  }) as unknown as typeof fetch

  const result = await verifyTurnstileToken('any-token', '203.0.113.9')
  assert.equal(result.success, false, 'an unverifiable request must not proceed')

  restore()
})
