import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import RegisterPageContent from './RegisterPageContent'

export const dynamic = 'force-dynamic'

async function getServiceSettings() {
  try {
    const settings = await prisma.serviceSettings.findFirst()
    return {
      appName: settings?.appName ?? 'Church App',
      authBackgroundUrl: settings?.authBackgroundUrl ?? null,
      authLogoUrl: settings?.authLogoUrl ?? null,
      authWelcomeHeading: settings?.authWelcomeHeading ?? 'your community',
      authTagline: settings?.authTagline ?? 'Connect, worship, and grow together.',
      authFooterText: settings?.authFooterText ?? 'Faith · Community · Purpose'
    }
  } catch {
    return {
      appName: 'Church App',
      authBackgroundUrl: null,
      authLogoUrl: null,
      authWelcomeHeading: 'your community',
      authTagline: 'Connect, worship, and grow together.',
      authFooterText: 'Faith · Community · Purpose'
    }
  }
}

export async function generateMetadata() {
  const settings = await getServiceSettings()
  return {
    title: `Register - ${settings.appName}`,
  }
}

export default async function RegisterPage() {
  const settings = await getServiceSettings()
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--auth-cream, #faf8f4)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent" style={{ borderTopColor: 'var(--auth-gold, #c9a84c)', borderRightColor: 'var(--auth-gold, #c9a84c)' }} />
          <p className="text-sm" style={{ color: 'var(--auth-slate, #64748b)' }}>Loading...</p>
        </div>
      </div>
    }>
      <RegisterPageContent
        initialAppName={settings.appName}
        initialBgUrl={settings.authBackgroundUrl}
        initialLogoUrl={settings.authLogoUrl}
        initialWelcomeHeading={settings.authWelcomeHeading}
        initialTagline={settings.authTagline}
        initialFooterText={settings.authFooterText}
      />
    </Suspense>
  )
}
