import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import RegisterPageContent from './RegisterPageContent'

async function getServiceSettings() {
  try {
    const settings = await prisma.serviceSettings.findFirst()
    return {
      appName: settings?.appName ?? 'Church App',
      authBackgroundUrl: settings?.authBackgroundUrl ?? null
    }
  } catch {
    return {
      appName: 'Church App',
      authBackgroundUrl: null
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <RegisterPageContent 
        initialAppName={settings.appName}
        initialBgUrl={settings.authBackgroundUrl}
      />
    </Suspense>
  )
}
