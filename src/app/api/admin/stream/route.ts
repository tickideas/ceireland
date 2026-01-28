import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { streamUrl, posterUrl, isActive } = await request.json()

    // Get existing settings or create new one
    let streamSettings = await prisma.streamSettings.findFirst()

    if (streamSettings) {
      // Update existing
      streamSettings = await prisma.streamSettings.update({
        where: { id: streamSettings.id },
        data: {
          streamUrl: streamUrl || null,
          posterUrl: posterUrl || null,
          isActive: isActive ?? false
        }
      })
    } else {
      // Create new
      streamSettings = await prisma.streamSettings.create({
        data: {
          streamUrl: streamUrl || null,
          posterUrl: posterUrl || null,
          isActive: isActive ?? false
        }
      })
    }

    return NextResponse.json({
      message: 'Stream settings updated successfully',
      streamUrl: streamSettings.streamUrl,
      posterUrl: streamSettings.posterUrl,
      isActive: streamSettings.isActive
    })
  } catch (error) {
    console.error('Update stream settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
