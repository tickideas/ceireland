import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Admin endpoints to read and update the dashboard header + service info

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      authBackgroundUrl: settings?.authBackgroundUrl ?? '',
      authLogoUrl: settings?.authLogoUrl ?? '',
      authWelcomeHeading: settings?.authWelcomeHeading ?? 'your community',
      authTagline: settings?.authTagline ?? 'Connect, worship, and grow together.',
      authFooterText: settings?.authFooterText ?? 'Faith · Community · Purpose'
    })
  } catch (error) {
    console.error('Get service settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    
    // Build update data object with only defined values
    const updateData: Record<string, string | null> = {}
    if (body.appName !== undefined) updateData.appName = body.appName
    if (body.headerTitle !== undefined) updateData.headerTitle = body.headerTitle
    if (body.sundayLabel !== undefined) updateData.sundayLabel = body.sundayLabel
    if (body.sundayTime !== undefined) updateData.sundayTime = body.sundayTime
    if (body.wednesdayLabel !== undefined) updateData.wednesdayLabel = body.wednesdayLabel
    if (body.wednesdayTime !== undefined) updateData.wednesdayTime = body.wednesdayTime
    if (body.prayerLabel !== undefined) updateData.prayerLabel = body.prayerLabel
    if (body.prayerTime !== undefined) updateData.prayerTime = body.prayerTime
    if (body.authBackgroundUrl !== undefined) updateData.authBackgroundUrl = body.authBackgroundUrl
    if (body.authLogoUrl !== undefined) updateData.authLogoUrl = body.authLogoUrl
    if (body.authWelcomeHeading !== undefined) updateData.authWelcomeHeading = body.authWelcomeHeading
    if (body.authTagline !== undefined) updateData.authTagline = body.authTagline
    if (body.authFooterText !== undefined) updateData.authFooterText = body.authFooterText

    // Find existing settings or create
    const existing = await prisma.serviceSettings.findFirst()
    let saved
    if (existing) {
      saved = await prisma.serviceSettings.update({
        where: { id: existing.id },
        data: updateData,
      })
    } else {
      saved = await prisma.serviceSettings.create({
        data: {
          appName: body.appName ?? 'Church App',
          headerTitle: body.headerTitle ?? 'Church Service',
          sundayLabel: body.sundayLabel ?? 'Sunday',
          sundayTime: body.sundayTime ?? '10:00 AM',
          wednesdayLabel: body.wednesdayLabel ?? 'Wednesday',
          wednesdayTime: body.wednesdayTime ?? '7:00 PM',
          prayerLabel: body.prayerLabel ?? 'Prayer',
          prayerTime: body.prayerTime ?? 'Daily 6:00 AM',
          authBackgroundUrl: body.authBackgroundUrl ?? null,
          authLogoUrl: body.authLogoUrl ?? null,
          authWelcomeHeading: body.authWelcomeHeading ?? 'your community',
          authTagline: body.authTagline ?? 'Connect, worship, and grow together.',
          authFooterText: body.authFooterText ?? 'Faith · Community · Purpose',
        }
      })
    }

    return NextResponse.json({
      message: 'Service settings saved',
      appName: saved.appName,
      headerTitle: saved.headerTitle,
      sundayLabel: saved.sundayLabel,
      sundayTime: saved.sundayTime,
      wednesdayLabel: saved.wednesdayLabel,
      wednesdayTime: saved.wednesdayTime,
      prayerLabel: saved.prayerLabel,
      prayerTime: saved.prayerTime,
      authBackgroundUrl: saved.authBackgroundUrl ?? '',
      authLogoUrl: saved.authLogoUrl ?? '',
      authWelcomeHeading: saved.authWelcomeHeading ?? 'your community',
      authTagline: saved.authTagline ?? 'Connect, worship, and grow together.',
      authFooterText: saved.authFooterText ?? 'Faith · Community · Purpose',
    })
  } catch (error) {
    console.error('Update service settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
