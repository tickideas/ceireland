import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get the first (and should be only) stream settings record
    const streamSettings = await prisma.streamSettings.findFirst()

    return NextResponse.json({
      streamUrl: streamSettings?.streamUrl || '',
      posterUrl: streamSettings?.posterUrl || '',
      isActive: streamSettings?.isActive || false
    })
  } catch (error) {
    console.error('Get stream settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
