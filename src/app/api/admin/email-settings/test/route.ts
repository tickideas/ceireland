import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { testEmailSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { sendTestEmail } from '@/lib/email'
import { ValidationError, errorToResponse, logError } from '@/lib/errors'

/**
 * POST /api/admin/email-settings/test
 * Send a test email to verify configuration
 */
export async function POST(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const body = await request.json()

    const validation = safeValidate(testEmailSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { recipientEmail } = validation.data

    const result = await sendTestEmail(recipientEmail)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send test email' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${recipientEmail}`
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'SendTestEmail')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
