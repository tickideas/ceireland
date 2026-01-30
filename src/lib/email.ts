import { UseSend } from 'usesend-js'
import { prisma } from './prisma'

// Cache for email settings (1 minute TTL)
let emailSettingsCache: {
  data: {
    emailVerificationEnabled: boolean
    providerApiKey: string | null
    providerBaseUrl: string | null
    fromEmail: string | null
    fromName: string | null
  } | null
  timestamp: number
} | null = null

const CACHE_TTL_MS = 60 * 1000 // 1 minute

/**
 * Invalidate the email settings cache
 * Call this after updating email settings
 */
export function invalidateEmailSettingsCache(): void {
  emailSettingsCache = null
}

/**
 * Get email settings from database with caching
 * Falls back to environment variables if no DB settings
 */
export async function getEmailSettings(): Promise<{
  emailVerificationEnabled: boolean
  providerApiKey: string | null
  providerBaseUrl: string | null
  fromEmail: string | null
  fromName: string | null
}> {
  // Check cache first
  if (emailSettingsCache && Date.now() - emailSettingsCache.timestamp < CACHE_TTL_MS) {
    return emailSettingsCache.data!
  }

  // Fetch from database
  const dbSettings = await prisma.emailSettings.findFirst()

  // Build settings with DB values falling back to env vars
  const settings = {
    emailVerificationEnabled: dbSettings?.emailVerificationEnabled ?? true,
    providerApiKey: dbSettings?.providerApiKey || process.env.USESEND_API_KEY || null,
    providerBaseUrl: dbSettings?.providerBaseUrl || process.env.USESEND_BASE_URL?.replace(/\/api\/?$/, '') || null,
    fromEmail: dbSettings?.fromEmail || process.env.USESEND_FROM_EMAIL || null,
    fromName: dbSettings?.fromName || process.env.NEXT_PUBLIC_APP_NAME || null,
  }

  // Update cache
  emailSettingsCache = {
    data: settings,
    timestamp: Date.now(),
  }

  return settings
}

/**
 * Create a UseSend client with current settings
 * Returns null if not configured
 */
export async function getEmailClient(): Promise<UseSend | null> {
  const settings = await getEmailSettings()

  if (!settings.providerApiKey) {
    return null
  }

  return new UseSend(settings.providerApiKey, settings.providerBaseUrl || undefined)
}

/**
 * Check if email is properly configured (async - checks DB)
 */
export async function isEmailConfigured(): Promise<boolean> {
  const settings = await getEmailSettings()
  return !!settings.providerApiKey
}

/**
 * Check if email verification is enabled
 */
export async function isEmailVerificationEnabled(): Promise<boolean> {
  const settings = await getEmailSettings()
  return settings.emailVerificationEnabled
}

/**
 * Get the from email address
 */
export async function getFromEmail(): Promise<string> {
  const settings = await getEmailSettings()
  return settings.fromEmail || 'noreply@christembassyireland.org'
}

/**
 * Get the from name
 */
export async function getFromName(): Promise<string> {
  const settings = await getEmailSettings()
  return settings.fromName || 'Christ Embassy Ireland'
}

/**
 * Get full "From" header string
 */
export async function getFromHeader(): Promise<string> {
  const [name, email] = await Promise.all([getFromName(), getFromEmail()])
  return `${name} <${email}>`
}

/**
 * Send approval notification email
 */
export async function sendApprovalNotification(email: string, userName: string) {
  const client = await getEmailClient()

  if (!client) {
    console.warn('Email not configured; approval notification not sent')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const fromHeader = await getFromHeader()
  const appName = await getFromName()

  try {
    await client.emails.send({
      from: fromHeader,
      to: email,
      subject: 'Your Account Has Been Approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a365d; margin-bottom: 24px;">Account Approved</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
            Your ${appName} account has been approved!
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}/login"
               style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
                      color: white;
                      padding: 14px 32px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: 600;
                      display: inline-block;">
              Login to Your Account
            </a>
          </div>
          <p style="color: #a0aec0; font-size: 12px;">
            God bless!
          </p>
        </div>
      `
    })
  } catch (e) {
    console.warn('Failed to send approval email to', email, e)
  }
}

/**
 * Send a test email to verify configuration
 */
export async function sendTestEmail(recipientEmail: string): Promise<{ success: boolean; error?: string }> {
  const client = await getEmailClient()

  if (!client) {
    return { success: false, error: 'Email provider not configured' }
  }

  const fromHeader = await getFromHeader()
  const appName = await getFromName()

  try {
    await client.emails.send({
      from: fromHeader,
      to: recipientEmail,
      subject: `Test Email from ${appName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a365d; margin-bottom: 24px;">Test Email</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
            This is a test email from ${appName} to verify your email configuration is working correctly.
          </p>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
            If you received this email, your email settings are configured properly!
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #a0aec0; font-size: 12px;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to send test email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test email'
    }
  }
}
