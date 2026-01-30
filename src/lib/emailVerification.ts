import crypto from 'crypto'
import { prisma } from './prisma'
import { usesend, isEmailConfigured } from './email'

const TOKEN_EXPIRY_HOURS = 24
const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com', 'tempmail.com', 'throwaway.email', 'guerrillamail.com',
  'sharklasers.com', 'guerrillamail.info', 'grr.la', 'guerrillamail.biz',
  'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org', 'spam4.me',
  'temp-mail.org', 'fakeinbox.com', 'getnada.com', 'yopmail.com',
  'mailnesia.com', 'trashmail.com', 'mytemp.email', '10minutemail.com',
  'tempail.com', 'dispostable.com', 'mailcatch.com', 'tempr.email'
]

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? DISPOSABLE_EMAIL_DOMAINS.includes(domain) : false
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function createVerificationToken(email: string): Promise<string> {
  const token = generateVerificationToken()
  const hashedToken = hashToken(token)
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  await prisma.emailVerificationToken.deleteMany({ where: { email } })

  await prisma.emailVerificationToken.create({
    data: {
      token: hashedToken,
      email,
      expiresAt
    }
  })

  return token
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; email?: string; error?: string }> {
  const hashedToken = hashToken(token)

  const tokenRecord = await prisma.emailVerificationToken.findUnique({
    where: { token: hashedToken }
  })

  if (!tokenRecord) {
    return { success: false, error: 'Invalid or expired verification link' }
  }

  if (tokenRecord.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: tokenRecord.id } })
    return { success: false, error: 'Verification link has expired' }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email: tokenRecord.email },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date()
      }
    }),
    prisma.emailVerificationToken.delete({ where: { id: tokenRecord.id } })
  ])

  return { success: true, email: tokenRecord.email }
}

export async function sendVerificationEmail(
  email: string,
  userName: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const verificationUrl = `${appUrl}/api/auth/verify-email?token=${token}`

  if (!isEmailConfigured()) {
    console.warn('Usesend not configured; verification email not sent')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const fromEmail = process.env.USESEND_FROM_EMAIL || 'noreply@christembassyireland.org'
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Christ Embassy Ireland'

    await usesend!.emails.send({
      from: `${appName} <${fromEmail}>`,
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a365d; margin-bottom: 24px;">Welcome to ${appName}!</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
            Thank you for registering. Please verify your email address by clicking the button below:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%); 
                      color: white; 
                      padding: 14px 32px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: 600;
                      display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #718096; font-size: 14px; line-height: 1.6;">
            Or copy and paste this link into your browser:<br/>
            <a href="${verificationUrl}" style="color: #3182ce; word-break: break-all;">${verificationUrl}</a>
          </p>
          <p style="color: #718096; font-size: 14px; line-height: 1.6;">
            This link will expire in ${TOKEN_EXPIRY_HOURS} hours.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #a0aec0; font-size: 12px;">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      `
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to send verification email:', error)
    return { success: false, error: 'Failed to send verification email' }
  }
}

export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.emailVerificationToken.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  })
  return result.count
}
