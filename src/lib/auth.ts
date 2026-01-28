import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import type { SessionUser } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET && process.env.NODE_ENV !== 'test') {
  console.warn('Warning: JWT_SECRET environment variable is not defined')
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

export function signToken(payload: JWTPayload): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not defined')
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not defined')
  }
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export async function getUserFromCookies(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return null
    }

    const payload = verifyToken(token)
    if (!payload) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
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

    return user as SessionUser | null
  } catch {
    return null
  }
}

export interface OpenEvent {
  id: string
  title: string
  description?: string | null
  startDate: Date
  endDate: Date
  isActive: boolean
  allowPublic: boolean
}

export async function getCurrentOpenEvent(): Promise<{ hasActiveEvent: boolean; activeEvent: OpenEvent | null }> {
  try {
    const now = new Date()
    
    const activeOpenEvent = await prisma.openEvent.findFirst({
      where: {
        isActive: true,
        allowPublic: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        isActive: true,
        allowPublic: true
      }
    })

    return { 
      hasActiveEvent: !!activeOpenEvent,
      activeEvent: activeOpenEvent
    }
  } catch {
    return { hasActiveEvent: false, activeEvent: null }
  }
}

