import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    let settings = await prisma.cTASettings.findFirst()

    if (!settings) {
      settings = await prisma.cTASettings.create({
        data: {}
      })
    }

    return NextResponse.json({
      givingEnabled: settings.givingEnabled,
      givingButtonLabel: settings.givingButtonLabel,
      givingUrl: settings.givingUrl,
      offlineGivingTitle: settings.offlineGivingTitle,
      offlineGivingDetails: settings.offlineGivingDetails,
      givingColorFrom: settings.givingColorFrom,
      givingColorTo: settings.givingColorTo,
      prayerEnabled: settings.prayerEnabled,
      prayerButtonLabel: settings.prayerButtonLabel,
      prayerFormTitle: settings.prayerFormTitle,
      prayerFormDescription: settings.prayerFormDescription,
      prayerColorFrom: settings.prayerColorFrom,
      prayerColorTo: settings.prayerColorTo,
      salvationEnabled: settings.salvationEnabled,
      salvationButtonLabel: settings.salvationButtonLabel,
      salvationTitle: settings.salvationTitle,
      salvationPrayer: settings.salvationPrayer,
      salvationConfirmText: settings.salvationConfirmText,
      salvationColorFrom: settings.salvationColorFrom,
      salvationColorTo: settings.salvationColorTo
    })
  } catch (error) {
    console.error('Error fetching CTA settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}
