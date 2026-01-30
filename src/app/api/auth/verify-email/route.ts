import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailToken } from '@/lib/emailVerification'
import { logError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?error=missing_token`
      )
    }

    const result = await verifyEmailToken(token)

    if (!result.success) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?error=${encodeURIComponent(result.error || 'verification_failed')}`
      )
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?success=true`
    )
  } catch (error) {
    logError(error instanceof Error ? error : new Error('Unknown error'), 'VerifyEmail')
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?error=server_error`
    )
  }
}
