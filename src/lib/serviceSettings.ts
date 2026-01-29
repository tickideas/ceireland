import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

const SERVICE_SETTINGS_CACHE_KEY = ['service-settings']

export const getServiceSettingsCached = unstable_cache(
  async () => prisma.serviceSettings.findFirst(),
  SERVICE_SETTINGS_CACHE_KEY,
  { revalidate: 300, tags: ['service-settings'] }
)
