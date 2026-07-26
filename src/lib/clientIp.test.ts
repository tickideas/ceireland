import test from 'node:test'
import assert from 'node:assert/strict'
import { getClientIp } from './clientIp'

function requestWith(headers: Record<string, string>) {
  return new Request('https://example.com', { headers })
}

test('getClientIp ignores client-spoofed entries left of the proxy hop', () => {
  // Client sends its own XFF; Traefik appends the real peer address.
  const request = requestWith({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' })
  assert.equal(getClientIp(request), '203.0.113.9')
})

test('getClientIp reads a single-entry chain from the proxy', () => {
  assert.equal(getClientIp(requestWith({ 'x-forwarded-for': '203.0.113.9' })), '203.0.113.9')
})

test('getClientIp falls back to x-real-ip then unknown', () => {
  assert.equal(getClientIp(requestWith({ 'x-real-ip': '198.51.100.7' })), '198.51.100.7')
  assert.equal(getClientIp(requestWith({})), 'unknown')
})
