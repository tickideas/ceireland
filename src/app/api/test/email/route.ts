import { NextRequest, NextResponse } from 'next/server'
import { getEmailClient, isEmailConfigured, getFromHeader } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // TEMP: Allow testing without auth - remove this check after testing
    const { email, skipAuth } = await request.json()

    if (!skipAuth) {
      // Re-enable auth check after testing
      const { verifyToken } = await import('@/lib/auth')
      const token = request.cookies.get('auth-token')?.value
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized - pass skipAuth:true for testing' }, { status: 401 })
      }
      const payload = verifyToken(token)
      if (!payload || payload.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const configured = await isEmailConfigured()
    if (!configured) {
      return NextResponse.json({
        error: 'Email not configured',
        env: {
          hasApiKey: !!process.env.USESEND_API_KEY,
          hasBaseUrl: !!process.env.USESEND_BASE_URL,
          baseUrl: process.env.USESEND_BASE_URL
        }
      }, { status: 500 })
    }

    const client = await getEmailClient()
    if (!client) {
      return NextResponse.json({ error: 'Failed to create email client' }, { status: 500 })
    }

    const fromHeader = await getFromHeader()

    const result = await client.emails.send({
      from: fromHeader,
      to: email,
      subject: 'Test Email from Christ Embassy Ireland',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a365d;">Test Email</h2>
          <p>This is a test email from your Christ Embassy Ireland app.</p>
          <p>If you received this, your email configuration is working!</p>
          <hr style="margin: 24px 0;" />
          <p style="color: #718096; font-size: 12px;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `
    })

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      result
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
