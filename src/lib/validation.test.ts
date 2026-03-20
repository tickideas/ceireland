import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createUserSchema,
  ctaSettingsSchema,
  serviceScheduleManageSchema,
  serviceSettingsSchema,
  testEmailSchema,
} from './validation'

test('createUserSchema normalizes email and accepts valid admin payload', () => {
  const parsed = createUserSchema.parse({
    name: 'Ada',
    lastName: 'Lovelace',
    email: ' ADA@EXAMPLE.COM ',
    role: 'ADMIN',
  })

  assert.equal(parsed.email, 'ada@example.com')
  assert.equal(parsed.role, 'ADMIN')
})

test('testEmailSchema requires a valid recipient email', () => {
  const result = testEmailSchema.safeParse({ recipientEmail: 'not-an-email' })
  assert.equal(result.success, false)
})

test('serviceSettingsSchema accepts extended branding and SEO fields', () => {
  const parsed = serviceSettingsSchema.parse({
    appName: 'Church App',
    authLogoUrl: 'https://example.com/logo.png',
    seoImage: 'https://example.com/og.png',
    twitterCardType: 'summary_large_image',
  })

  assert.equal(parsed.authLogoUrl, 'https://example.com/logo.png')
  assert.equal(parsed.seoImage, 'https://example.com/og.png')
  assert.equal(parsed.twitterCardType, 'summary_large_image')
})

test('ctaSettingsSchema rejects invalid giving urls', () => {
  const result = ctaSettingsSchema.safeParse({ givingUrl: 'notaurl' })
  assert.equal(result.success, false)
})

test('serviceScheduleManageSchema rejects impossible dayOfMonth values', () => {
  const result = serviceScheduleManageSchema.safeParse({
    name: 'Monthly Prayer',
    time: '18:00',
    dayOfMonth: 32,
  })

  assert.equal(result.success, false)
})
