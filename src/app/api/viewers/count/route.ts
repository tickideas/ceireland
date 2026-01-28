import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// How long before a viewer session is considered stale (in milliseconds)
const STALE_SESSION_THRESHOLD = 60 * 1000 // 60 seconds

export async function GET() {
  try {
    const now = new Date()
    const activeThreshold = new Date(now.getTime() - STALE_SESSION_THRESHOLD)

    // Count active viewers (within last 60 seconds)
    const activeViewers = await prisma.viewerSession.count({
      where: {
        lastSeen: { gte: activeThreshold },
      },
    })

    return NextResponse.json({
      viewerCount: activeViewers,
    })
  } catch (error) {
    console.error('Get viewer count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
