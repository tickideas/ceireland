import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS, type RateLimitResult } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/clientIp'
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
  errorResponse
} from '@/lib/errors'

function rateLimited(result: RateLimitResult, fallbackMessage: string) {
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
  const err = new RateLimitError(result.error || fallbackMessage, retryAfter)
  return NextResponse.json(errorToResponse(err), {
    status: err.statusCode,
    headers: {
      'Retry-After': String(retryAfter)
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    // Per-IP limit is checked before any parsing so a flood is rejected as
    // cheaply as possible.
    const clientIp = getClientIp(request)
    const ipRateLimit = await checkRateLimit(`register-ip:${clientIp}`, RATE_LIMITS.REGISTER_IP)
    if (!ipRateLimit.success) {
      return rateLimited(ipRateLimit, 'Too many registration attempts')
    }

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

    // Site-wide ceiling: bounds total verification emails per hour regardless
    // of how many addresses or source IPs the caller rotates through.
    const globalRateLimit = await checkRateLimit('register-global', RATE_LIMITS.REGISTER_GLOBAL)
    if (!globalRateLimit.success) {
      return rateLimited(globalRateLimit, 'Registrations are temporarily unavailable')
    }

    // Per-email limit (5 attempts per hour) stops repeated signups for one address.
    const rateLimitResult = await checkRateLimit(`register:${email}`, RATE_LIMITS.REGISTER)
    if (!rateLimitResult.success) {
      return rateLimited(rateLimitResult, 'Too many registration attempts')
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
    return errorResponse(error, 'Registration')
  }
}