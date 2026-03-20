import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { sendTestEmail } from '@/lib/email'
import { testEmailSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse, logError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const body = await request.json()
    const normalizedBody = {
      recipientEmail: body?.recipientEmail ?? body?.email,
    }

    const validation = safeValidate(testEmailSchema, normalizedBody)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const result = await sendTestEmail(validation.data.recipientEmail)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send test email' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${validation.data.recipientEmail}`,
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'LegacyTestEmail')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
