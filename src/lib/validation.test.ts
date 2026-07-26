import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createUserSchema,
  registerSchema,
  ctaSettingsSchema,
  serviceScheduleManageSchema,
  serviceSettingsSchema,
  testEmailSchema,
} from './validation'

test('createUserSchema normalizes email and accepts valid admin payload', () => {
  const parsed = createUserSchema.parse({
    name: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
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

test('registerSchema accepts international and punctuated real names', () => {
  const parsed = registerSchema.parse({
    title: 'Dr.',
    name: "Chiamaka O'Brien",
    lastName: 'Adébáyọ̀-Ríordáin',
    email: 'Chiamaka@Example.com',
    phone: '+353 87 123 4567',
  })

  assert.equal(parsed.email, 'chiamaka@example.com')
  assert.equal(parsed.lastName, 'Adébáyọ̀-Ríordáin')
})

test('registerSchema rejects the spam-relay payload used in the signup flood', () => {
  const result = registerSchema.safeParse({
    title: 'Dr.',
    name: '🚀Sansli gunun geldi! Slotlari simdi cevir',
    lastName: 'kazan! https://bit.ly/4p0CDXp 🚀 Go',
    email: 'victim@example.com',
    phone: '+19026404252',
  })

  assert.equal(result.success, false)
})

test('registerSchema rejects URLs and HTML in name fields', () => {
  for (const name of ['http://evil.example', '<b>bold</b>', 'Win $5000 now']) {
    const result = registerSchema.safeParse({
      title: 'Mr',
      name,
      lastName: 'Smith',
      email: 'a@example.com',
      phone: '123',
    })
    assert.equal(result.success, false, `expected rejection for: ${name}`)
  }
})
