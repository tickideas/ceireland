import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { ctaSettingsSchema } from '@/lib/validation'

export const GET = adminRoute({}, async () => {
  let settings = await prisma.cTASettings.findFirst()
  if (!settings) {
    settings = await prisma.cTASettings.create({ data: {} })
  }
  return settings
})

export const PUT = adminRoute({ body: ctaSettingsSchema }, async ({ body: data }) => {
  let settings = await prisma.cTASettings.findFirst()

  if (settings) {
    settings = await prisma.cTASettings.update({
      where: { id: settings.id },
      data: {
        givingEnabled: data.givingEnabled,
        givingButtonLabel: data.givingButtonLabel,
        givingUrl: data.givingUrl || null,
        offlineGivingTitle: data.offlineGivingTitle,
        offlineGivingDetails: data.offlineGivingDetails || null,
        givingColorFrom: data.givingColorFrom,
        givingColorTo: data.givingColorTo,
        prayerEnabled: data.prayerEnabled,
        prayerButtonLabel: data.prayerButtonLabel,
        prayerFormTitle: data.prayerFormTitle,
        prayerFormDescription: data.prayerFormDescription || null,
        prayerColorFrom: data.prayerColorFrom,
        prayerColorTo: data.prayerColorTo,
        salvationEnabled: data.salvationEnabled,
        salvationButtonLabel: data.salvationButtonLabel,
        salvationTitle: data.salvationTitle,
        salvationPrayer: data.salvationPrayer || null,
        salvationConfirmText: data.salvationConfirmText,
        salvationColorFrom: data.salvationColorFrom,
        salvationColorTo: data.salvationColorTo
      }
    })
  } else {
    settings = await prisma.cTASettings.create({
      data: {
        givingEnabled: data.givingEnabled ?? true,
        givingButtonLabel: data.givingButtonLabel ?? 'Online Giving',
        givingUrl: data.givingUrl || null,
        offlineGivingTitle: data.offlineGivingTitle ?? 'Offline Giving Details',
        offlineGivingDetails: data.offlineGivingDetails || null,
        givingColorFrom: data.givingColorFrom ?? '#ec4899',
        givingColorTo: data.givingColorTo ?? '#f43f5e',
        prayerEnabled: data.prayerEnabled ?? true,
        prayerButtonLabel: data.prayerButtonLabel ?? 'Prayer Request',
        prayerFormTitle: data.prayerFormTitle ?? 'Submit Your Prayer Request',
        prayerFormDescription: data.prayerFormDescription || null,
        prayerColorFrom: data.prayerColorFrom ?? '#3b82f6',
        prayerColorTo: data.prayerColorTo ?? '#6366f1',
        salvationEnabled: data.salvationEnabled ?? true,
        salvationButtonLabel: data.salvationButtonLabel ?? 'Accept Christ',
        salvationTitle: data.salvationTitle ?? 'Prayer of Salvation',
        salvationPrayer: data.salvationPrayer || null,
        salvationConfirmText: data.salvationConfirmText ?? 'I just said this prayer',
        salvationColorFrom: data.salvationColorFrom ?? '#f59e0b',
        salvationColorTo: data.salvationColorTo ?? '#f97316'
      }
    })
  }

  return settings
})
