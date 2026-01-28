import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public endpoint used by the dashboard to read the current settings
export async function GET() {
  try {
    const settings = await prisma.serviceSettings.findFirst()
    return NextResponse.json({
      appName: settings?.appName ?? 'Church App',
      headerTitle: settings?.headerTitle ?? 'Church Service',
      sundayLabel: settings?.sundayLabel ?? 'Sunday',
      sundayTime: settings?.sundayTime ?? '10:00 AM',
      wednesdayLabel: settings?.wednesdayLabel ?? 'Wednesday',
      wednesdayTime: settings?.wednesdayTime ?? '7:00 PM',
      prayerLabel: settings?.prayerLabel ?? 'Prayer',
      prayerTime: settings?.prayerTime ?? 'Daily 6:00 AM',
      authBackgroundUrl: settings?.authBackgroundUrl ?? ''
    })
  } catch (error) {
    console.error('Get service settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
