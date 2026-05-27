import { NextResponse } from 'next/server'
import { adminRoute } from '@/lib/adminRoute'
import { testEmailSchema } from '@/lib/validation'
import { sendTestEmail } from '@/lib/email'

/**
 * POST /api/admin/email-settings/test
 * Send a test email to verify configuration
 */
export const POST = adminRoute({ body: testEmailSchema }, async ({ body }) => {
  const { recipientEmail } = body
  const result = await sendTestEmail(recipientEmail)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || 'Failed to send test email' },
      { status: 400 }
    )
  }

  return {
    success: true,
    message: `Test email sent successfully to ${recipientEmail}`
  }
})
