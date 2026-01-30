import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rateLimit'
import { resendVerificationSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { createVerificationToken, sendVerificationEmail } from '@/lib/emailVerification'
import { RateLimitError, ValidationError, errorToResponse, logError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = safeValidate(resendVerificationSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { email } = validation.data

    const rateLimitResult = checkRateLimit(`resend-verification:${email}`, {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000
    })

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      const err = new RateLimitError('Too many requests', retryAfter)
      return NextResponse.json(errorToResponse(err), {
        status: err.statusCode,
        headers: { 'Retry-After': String(retryAfter) }
      })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, lastName: true, emailVerified: true }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'If an account exists, a verification email has been sent' },
        { status: 200 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email already verified. Please log in.' },
        { status: 200 }
      )
    }

    const token = await createVerificationToken(email)
    const emailResult = await sendVerificationEmail(email, `${user.name} ${user.lastName}`, token)

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Verification email sent. Please check your inbox.' },
      { status: 200 }
    )
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'ResendVerification')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
