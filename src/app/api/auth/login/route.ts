import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS, resetRateLimit } from '@/lib/rateLimit'
import { loginSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import {
  ValidationError,
  AuthenticationError,
  RateLimitError,
  errorToResponse,
  logError
} from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = safeValidate(loginSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { email } = validation.data

    // Check rate limit (10 attempts per 15 minutes - church-friendly)
    const rateLimitResult = checkRateLimit(`login:${email}`, RATE_LIMITS.LOGIN)
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      const err = new RateLimitError(rateLimitResult.error || 'Too many login attempts', retryAfter)
      return NextResponse.json(errorToResponse(err), {
        status: err.statusCode,
        headers: {
          'Retry-After': String(retryAfter)
        }
      })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        title: true,
        phone: true,
        role: true,
        approved: true
      }
    })

    if (!user) {
      // Generic error to prevent email enumeration
      const err = new AuthenticationError('Invalid credentials')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    if (!user.approved) {
      const err = new AuthenticationError('Invalid credentials')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    // Reset rate limit on successful login
    resetRateLimit(`login:${email}`)

    const response = NextResponse.json({ 
      message: 'Login successful',
      user
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'Login')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}