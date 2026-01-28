import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

const MIN_SUBMIT_TIME_MS = 3000

const salvationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  website: z.string().optional(),
  formLoadedAt: z.number().optional()
})

function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  return 'unknown'
}

export async function POST(request: Request) {
  try {
    const clientIP = getClientIP(request)
    
    const rateLimitResult = checkRateLimit(`salvation:${clientIP}`, RATE_LIMITS.SALVATION)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error || 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    if (body.website && body.website.length > 0) {
      console.log('Bot detected via honeypot field (salvation)')
      return NextResponse.json({ success: true, id: 'submitted' })
    }

    if (body.formLoadedAt) {
      const submitTime = Date.now()
      const timeSpent = submitTime - body.formLoadedAt
      if (timeSpent < MIN_SUBMIT_TIME_MS) {
        console.log(`Bot detected via timing (salvation): ${timeSpent}ms`)
        return NextResponse.json({ success: true, id: 'submitted' })
      }
    }

    const validation = salvationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, phone } = validation.data

    const created = await prisma.salvationResponse.create({
      data: {
        name,
        email,
        phone: phone || null
      }
    })

    return NextResponse.json({ success: true, id: created.id })
  } catch (error) {
    console.error('Error submitting salvation response:', error)
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
  }
}
