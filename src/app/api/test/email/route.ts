import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adminRoute } from '@/lib/adminRoute'
import { sendTestEmail } from '@/lib/email'

// Legacy endpoint: accepts either `recipientEmail` or `email`.
const bodySchema = z
  .object({
    recipientEmail: z.string().email().max(255).toLowerCase().trim().optional(),
    email: z.string().email().max(255).toLowerCase().trim().optional(),
  })
  .refine((v) => !!(v.recipientEmail || v.email), {
    message: 'Recipient email is required',
    path: ['recipientEmail'],
  })

export const POST = adminRoute({ body: bodySchema }, async ({ body }) => {
  const recipient = (body.recipientEmail || body.email) as string

  const result = await sendTestEmail(recipient)
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || 'Failed to send test email' },
      { status: 400 }
    )
  }

  return {
    success: true,
    message: `Test email sent successfully to ${recipient}`,
  }
})
