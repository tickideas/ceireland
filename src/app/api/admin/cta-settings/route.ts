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

    let settings = await prisma.cTASettings.findFirst()

    if (!settings) {
      settings = await prisma.cTASettings.create({
        data: {}
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching CTA settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
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

    const body = await request.json()

    let settings = await prisma.cTASettings.findFirst()

    if (settings) {
      settings = await prisma.cTASettings.update({
        where: { id: settings.id },
        data: {
          givingEnabled: body.givingEnabled,
          givingButtonLabel: body.givingButtonLabel,
          givingUrl: body.givingUrl || null,
          offlineGivingTitle: body.offlineGivingTitle,
          offlineGivingDetails: body.offlineGivingDetails || null,
          givingColorFrom: body.givingColorFrom,
          givingColorTo: body.givingColorTo,
          prayerEnabled: body.prayerEnabled,
          prayerButtonLabel: body.prayerButtonLabel,
          prayerFormTitle: body.prayerFormTitle,
          prayerFormDescription: body.prayerFormDescription || null,
          prayerColorFrom: body.prayerColorFrom,
          prayerColorTo: body.prayerColorTo,
          salvationEnabled: body.salvationEnabled,
          salvationButtonLabel: body.salvationButtonLabel,
          salvationTitle: body.salvationTitle,
          salvationPrayer: body.salvationPrayer || null,
          salvationConfirmText: body.salvationConfirmText,
          salvationColorFrom: body.salvationColorFrom,
          salvationColorTo: body.salvationColorTo
        }
      })
    } else {
      settings = await prisma.cTASettings.create({
        data: {
          givingEnabled: body.givingEnabled ?? true,
          givingButtonLabel: body.givingButtonLabel ?? 'Online Giving',
          givingUrl: body.givingUrl || null,
          offlineGivingTitle: body.offlineGivingTitle ?? 'Offline Giving Details',
          offlineGivingDetails: body.offlineGivingDetails || null,
          givingColorFrom: body.givingColorFrom ?? '#ec4899',
          givingColorTo: body.givingColorTo ?? '#f43f5e',
          prayerEnabled: body.prayerEnabled ?? true,
          prayerButtonLabel: body.prayerButtonLabel ?? 'Prayer Request',
          prayerFormTitle: body.prayerFormTitle ?? 'Submit Your Prayer Request',
          prayerFormDescription: body.prayerFormDescription || null,
          prayerColorFrom: body.prayerColorFrom ?? '#3b82f6',
          prayerColorTo: body.prayerColorTo ?? '#6366f1',
          salvationEnabled: body.salvationEnabled ?? true,
          salvationButtonLabel: body.salvationButtonLabel ?? 'Accept Christ',
          salvationTitle: body.salvationTitle ?? 'Prayer of Salvation',
          salvationPrayer: body.salvationPrayer || null,
          salvationConfirmText: body.salvationConfirmText ?? 'I just said this prayer',
          salvationColorFrom: body.salvationColorFrom ?? '#f59e0b',
          salvationColorTo: body.salvationColorTo ?? '#f97316'
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating CTA settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
