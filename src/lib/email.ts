import { UseSend } from 'usesend-js'

const usesendApiKey = process.env.USESEND_API_KEY
// Remove trailing /api if present - the SDK adds /api/v1 automatically
const usesendBaseUrl = process.env.USESEND_BASE_URL?.replace(/\/api\/?$/, '')

export const usesend = usesendApiKey ? new UseSend(usesendApiKey, usesendBaseUrl) : null

export function isEmailConfigured(): boolean {
  return usesend !== null
}

export async function sendApprovalNotification(email: string, userName: string) {
  if (!isEmailConfigured()) {
    console.warn('Usesend not configured; approval notification not sent')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const fromEmail = process.env.USESEND_FROM_EMAIL || 'noreply@christembassyireland.org'
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Christ Embassy Ireland'

  try {
    await usesend!.emails.send({
      from: `${appName} <${fromEmail}>`,
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
