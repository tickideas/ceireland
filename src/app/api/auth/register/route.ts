import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import { registerSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import {
  createVerificationToken,
  sendVerificationEmail,
  isDisposableEmail
} from '@/lib/emailVerification'
import { isEmailVerificationEnabled } from '@/lib/email'
import {
  ValidationError,
  ConflictError,
  RateLimitError,
  errorToResponse,
  logError
} from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = safeValidate(registerSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { title, name, lastName, email, phone, honeypot } = validation.data

    if (honeypot && honeypot.length > 0) {
      const err = new ValidationError('Bot detected')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    // Check for disposable email addresses
    if (isDisposableEmail(email)) {
      const err = new ValidationError('Please use a valid email address')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    // Check rate limit (5 attempts per hour - prevents spam registrations)
    const rateLimitResult = checkRateLimit(`register:${email}`, RATE_LIMITS.REGISTER)
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      const err = new RateLimitError(rateLimitResult.error || 'Too many registration attempts', retryAfter)
      return NextResponse.json(errorToResponse(err), {
        status: err.statusCode,
        headers: {
          'Retry-After': String(retryAfter)
        }
      })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      const err = new ConflictError('User already exists')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    // Check if email verification is enabled
    const verificationEnabled = await isEmailVerificationEnabled()

    const user = await prisma.user.create({
      data: {
        title,
        name,
        lastName,
        email,
        phone,
        approved: true,
        // Auto-verify if email verification is disabled
        emailVerified: !verificationEnabled,
        emailVerifiedAt: !verificationEnabled ? new Date() : null
      }
    })

    // Only send verification email if verification is enabled
    if (verificationEnabled) {
      const token = await createVerificationToken(email)
      const emailResult = await sendVerificationEmail(email, `${name} ${lastName}`, token)

      return NextResponse.json({
        message: emailResult.success
          ? 'Registration successful! Please check your email to verify your account.'
          : 'Registration successful! Please contact support to activate your account.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        requiresVerification: true
      })
    }

    // Email verification disabled - user can log in immediately
    return NextResponse.json({
      message: 'Registration successful! You can now log in.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      requiresVerification: false
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'Registration')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}