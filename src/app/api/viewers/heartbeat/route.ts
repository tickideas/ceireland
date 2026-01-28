import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// How long before a viewer session is considered stale (in milliseconds)
const STALE_SESSION_THRESHOLD = 60 * 1000 // 60 seconds

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const now = new Date()

    // Upsert viewer session (create or update lastSeen)
    await prisma.viewerSession.upsert({
      where: { sessionId },
      update: { lastSeen: now },
      create: {
        userId: payload.userId,
        sessionId,
        lastSeen: now,
      },
    })

    // Clean up stale sessions (older than 2 minutes)
    const cleanupThreshold = new Date(now.getTime() - 2 * 60 * 1000)
    await prisma.viewerSession.deleteMany({
      where: {
        lastSeen: { lt: cleanupThreshold },
      },
    })

    // Count active viewers (within last 60 seconds)
    const activeThreshold = new Date(now.getTime() - STALE_SESSION_THRESHOLD)
    const activeViewers = await prisma.viewerSession.count({
      where: {
        lastSeen: { gte: activeThreshold },
      },
    })

    return NextResponse.json({
      ok: true,
      viewerCount: activeViewers,
    })
  } catch (error) {
    console.error('Viewer heartbeat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
