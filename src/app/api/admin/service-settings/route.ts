import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import type { TwitterCardType } from '@/types'

// Validation schema for service settings
const serviceSettingsSchema = z.object({
  appName: z.string().min(1).max(100).optional(),
  headerTitle: z.string().min(1).max(100).optional(),
  sundayLabel: z.string().min(1).max(50).optional(),
  sundayTime: z.string().min(1).max(50).optional(),
  wednesdayLabel: z.string().min(1).max(50).optional(),
  wednesdayTime: z.string().min(1).max(50).optional(),
  prayerLabel: z.string().min(1).max(50).optional(),
  prayerTime: z.string().min(1).max(50).optional(),
  authBackgroundUrl: z.string().url().max(500).optional().nullable(),
  authLogoUrl: z.string().url().max(500).optional().nullable(),
  authWelcomeHeading: z.string().min(1).max(100).optional(),
  authTagline: z.string().min(1).max(200).optional(),
  authFooterText: z.string().min(1).max(100).optional(),
  seoTitle: z.string().max(60).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
  seoImage: z.string().url().max(500).optional().nullable(),
  seoSiteName: z.string().max(100).optional().nullable(),
  twitterCardType: z.enum(['summary', 'summary_large_image']).optional(),
})

// Default settings for fallback
const DEFAULT_SETTINGS = {
  appName: 'Church App',
  headerTitle: 'Church Service',
  sundayLabel: 'Sunday',
  sundayTime: '10:00 AM',
  wednesdayLabel: 'Wednesday',
  wednesdayTime: '7:00 PM',
  prayerLabel: 'Prayer',
  prayerTime: 'Daily 6:00 AM',
  authBackgroundUrl: '',
  authLogoUrl: '',
  authWelcomeHeading: 'your community',
  authTagline: 'Connect, worship, and grow together.',
  authFooterText: 'Faith · Community · Purpose',
  seoTitle: '',
  seoDescription: '',
  seoImage: '',
  seoSiteName: '',
  twitterCardType: 'summary_large_image' as TwitterCardType,
}

// Helper to require admin authentication
async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const payload = verifyToken(token)
  if (!payload || payload.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { payload }
}

// Admin endpoints to read and update the dashboard header + service info

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const settings = await prisma.serviceSettings.findFirst()
    return NextResponse.json({
      appName: settings?.appName ?? DEFAULT_SETTINGS.appName,
      headerTitle: settings?.headerTitle ?? DEFAULT_SETTINGS.headerTitle,
      sundayLabel: settings?.sundayLabel ?? DEFAULT_SETTINGS.sundayLabel,
      sundayTime: settings?.sundayTime ?? DEFAULT_SETTINGS.sundayTime,
      wednesdayLabel: settings?.wednesdayLabel ?? DEFAULT_SETTINGS.wednesdayLabel,
      wednesdayTime: settings?.wednesdayTime ?? DEFAULT_SETTINGS.wednesdayTime,
      prayerLabel: settings?.prayerLabel ?? DEFAULT_SETTINGS.prayerLabel,
      prayerTime: settings?.prayerTime ?? DEFAULT_SETTINGS.prayerTime,
      authBackgroundUrl: settings?.authBackgroundUrl ?? DEFAULT_SETTINGS.authBackgroundUrl,
      authLogoUrl: settings?.authLogoUrl ?? DEFAULT_SETTINGS.authLogoUrl,
      authWelcomeHeading: settings?.authWelcomeHeading ?? DEFAULT_SETTINGS.authWelcomeHeading,
      authTagline: settings?.authTagline ?? DEFAULT_SETTINGS.authTagline,
      authFooterText: settings?.authFooterText ?? DEFAULT_SETTINGS.authFooterText,
      seoTitle: settings?.seoTitle ?? DEFAULT_SETTINGS.seoTitle,
      seoDescription: settings?.seoDescription ?? DEFAULT_SETTINGS.seoDescription,
      seoImage: settings?.seoImage ?? DEFAULT_SETTINGS.seoImage,
      seoSiteName: settings?.seoSiteName ?? DEFAULT_SETTINGS.seoSiteName,
      twitterCardType: settings?.twitterCardType ?? DEFAULT_SETTINGS.twitterCardType,
    })
  } catch (error) {
    console.error('Get service settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const body = await request.json()
    
    // Validate input
    const validationResult = serviceSettingsSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data
    
    // Build update data object with only defined values
    const updateData: Record<string, string | null> = {}
    if (validatedData.appName !== undefined) updateData.appName = validatedData.appName
    if (validatedData.headerTitle !== undefined) updateData.headerTitle = validatedData.headerTitle
    if (validatedData.sundayLabel !== undefined) updateData.sundayLabel = validatedData.sundayLabel
    if (validatedData.sundayTime !== undefined) updateData.sundayTime = validatedData.sundayTime
    if (validatedData.wednesdayLabel !== undefined) updateData.wednesdayLabel = validatedData.wednesdayLabel
    if (validatedData.wednesdayTime !== undefined) updateData.wednesdayTime = validatedData.wednesdayTime
    if (validatedData.prayerLabel !== undefined) updateData.prayerLabel = validatedData.prayerLabel
    if (validatedData.prayerTime !== undefined) updateData.prayerTime = validatedData.prayerTime
    if (validatedData.authBackgroundUrl !== undefined) updateData.authBackgroundUrl = validatedData.authBackgroundUrl
    if (validatedData.authLogoUrl !== undefined) updateData.authLogoUrl = validatedData.authLogoUrl
    if (validatedData.authWelcomeHeading !== undefined) updateData.authWelcomeHeading = validatedData.authWelcomeHeading
    if (validatedData.authTagline !== undefined) updateData.authTagline = validatedData.authTagline
    if (validatedData.authFooterText !== undefined) updateData.authFooterText = validatedData.authFooterText
    if (validatedData.seoTitle !== undefined) updateData.seoTitle = validatedData.seoTitle
    if (validatedData.seoDescription !== undefined) updateData.seoDescription = validatedData.seoDescription
    if (validatedData.seoImage !== undefined) updateData.seoImage = validatedData.seoImage
    if (validatedData.seoSiteName !== undefined) updateData.seoSiteName = validatedData.seoSiteName
    if (validatedData.twitterCardType !== undefined) updateData.twitterCardType = validatedData.twitterCardType

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
          appName: validatedData.appName ?? DEFAULT_SETTINGS.appName,
          headerTitle: validatedData.headerTitle ?? DEFAULT_SETTINGS.headerTitle,
          sundayLabel: validatedData.sundayLabel ?? DEFAULT_SETTINGS.sundayLabel,
          sundayTime: validatedData.sundayTime ?? DEFAULT_SETTINGS.sundayTime,
          wednesdayLabel: validatedData.wednesdayLabel ?? DEFAULT_SETTINGS.wednesdayLabel,
          wednesdayTime: validatedData.wednesdayTime ?? DEFAULT_SETTINGS.wednesdayTime,
          prayerLabel: validatedData.prayerLabel ?? DEFAULT_SETTINGS.prayerLabel,
          prayerTime: validatedData.prayerTime ?? DEFAULT_SETTINGS.prayerTime,
          authBackgroundUrl: validatedData.authBackgroundUrl ?? null,
          authLogoUrl: validatedData.authLogoUrl ?? null,
          authWelcomeHeading: validatedData.authWelcomeHeading ?? DEFAULT_SETTINGS.authWelcomeHeading,
          authTagline: validatedData.authTagline ?? DEFAULT_SETTINGS.authTagline,
          authFooterText: validatedData.authFooterText ?? DEFAULT_SETTINGS.authFooterText,
          seoTitle: validatedData.seoTitle ?? null,
          seoDescription: validatedData.seoDescription ?? null,
          seoImage: validatedData.seoImage ?? null,
          seoSiteName: validatedData.seoSiteName ?? null,
          twitterCardType: validatedData.twitterCardType ?? DEFAULT_SETTINGS.twitterCardType,
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
      seoTitle: saved.seoTitle ?? '',
      seoDescription: saved.seoDescription ?? '',
      seoImage: saved.seoImage ?? '',
      seoSiteName: saved.seoSiteName ?? '',
      twitterCardType: saved.twitterCardType ?? 'summary_large_image',
    })
  } catch (error) {
    console.error('Update service settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
