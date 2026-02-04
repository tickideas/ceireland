import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    // Get the first (and should be only) stream settings record
    const streamSettings = await prisma.streamSettings.findFirst()

    if (!streamSettings) {
      return NextResponse.json({
        streamUrl: '',
        posterUrl: '',
        isActive: false
      })
    }

    let isActive = streamSettings.isActive

    // Check if scheduled end time has passed
    if (isActive && streamSettings.scheduledEndTime) {
      const now = new Date()
      if (now >= streamSettings.scheduledEndTime) {
        // Auto-deactivate the stream
        isActive = false
        
        // Update the database to reflect this (fire and forget)
        prisma.streamSettings.update({
          where: { id: streamSettings.id },
          data: { isActive: false, scheduledEndTime: null }
        }).catch(err => {
          console.error('Failed to auto-deactivate stream:', err)
        })
      }
    }

    return NextResponse.json({
      streamUrl: streamSettings.streamUrl || '',
      posterUrl: streamSettings.posterUrl || '',
      isActive
    })
  } catch (error) {
    console.error('Get stream settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
