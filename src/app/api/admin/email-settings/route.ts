import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { emailSettingsSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { invalidateEmailSettingsCache } from '@/lib/email'
import { ValidationError, errorToResponse, logError } from '@/lib/errors'
import type { EmailSettingsResponse } from '@/types'

/**
 * Mask API key - show only last 4 characters
 */
function maskApiKey(apiKey: string | null): string | null {
  if (!apiKey || apiKey.length < 8) return apiKey ? '****' : null
  return '****' + apiKey.slice(-4)
}

/**
 * GET /api/admin/email-settings
 * Returns email settings (with masked API key)
 */
export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    // Get or create settings (singleton pattern)
    let settings = await prisma.emailSettings.findFirst()

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.emailSettings.create({
        data: {
          emailVerificationEnabled: true,
        }
      })
    }

    // Check if we have env fallbacks
    const hasEnvApiKey = !!process.env.USESEND_API_KEY
    const hasEnvBaseUrl = !!process.env.USESEND_BASE_URL
    const hasEnvFromEmail = !!process.env.USESEND_FROM_EMAIL

    const response: EmailSettingsResponse = {
      id: settings.id,
      emailVerificationEnabled: settings.emailVerificationEnabled,
      providerApiKey: maskApiKey(settings.providerApiKey),
      providerBaseUrl: settings.providerBaseUrl,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      hasApiKey: !!(settings.providerApiKey || hasEnvApiKey),
      isConfigured: !!(
        (settings.providerApiKey || hasEnvApiKey) &&
        (settings.fromEmail || hasEnvFromEmail)
      ),
    }

    // Include env fallback indicators
    return NextResponse.json({
      ...response,
      envFallbacks: {
        apiKey: hasEnvApiKey && !settings.providerApiKey,
        baseUrl: hasEnvBaseUrl && !settings.providerBaseUrl,
        fromEmail: hasEnvFromEmail && !settings.fromEmail,
      }
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'GetEmailSettings')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}

/**
 * PUT /api/admin/email-settings
 * Update email settings
 */
export async function PUT(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const body = await request.json()

    const validation = safeValidate(emailSettingsSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { emailVerificationEnabled, providerApiKey, providerBaseUrl, fromEmail, fromName } = validation.data

    // Get existing settings or create
    let existingSettings = await prisma.emailSettings.findFirst()

    // Build update data - only include fields that were provided
    const updateData: {
      emailVerificationEnabled?: boolean
      providerApiKey?: string | null
      providerBaseUrl?: string | null
      fromEmail?: string | null
      fromName?: string | null
    } = {}

    if (emailVerificationEnabled !== undefined) {
      updateData.emailVerificationEnabled = emailVerificationEnabled
    }

    // Only update API key if a new one is provided (not masked)
    if (providerApiKey !== undefined && providerApiKey !== null && !providerApiKey.startsWith('****')) {
      updateData.providerApiKey = providerApiKey || null
    }

    if (providerBaseUrl !== undefined) {
      // Remove trailing /api if present
      updateData.providerBaseUrl = providerBaseUrl?.replace(/\/api\/?$/, '') || null
    }

    if (fromEmail !== undefined) {
      updateData.fromEmail = fromEmail || null
    }

    if (fromName !== undefined) {
      updateData.fromName = fromName || null
    }

    let settings
    if (existingSettings) {
      settings = await prisma.emailSettings.update({
        where: { id: existingSettings.id },
        data: updateData
      })
    } else {
      settings = await prisma.emailSettings.create({
        data: {
          emailVerificationEnabled: emailVerificationEnabled ?? true,
          providerApiKey: providerApiKey && !providerApiKey.startsWith('****') ? providerApiKey : null,
          providerBaseUrl: providerBaseUrl?.replace(/\/api\/?$/, '') || null,
          fromEmail: fromEmail || null,
          fromName: fromName || null,
        }
      })
    }

    // Invalidate cache so changes take effect immediately
    invalidateEmailSettingsCache()

    // Check env fallbacks
    const hasEnvApiKey = !!process.env.USESEND_API_KEY
    const hasEnvFromEmail = !!process.env.USESEND_FROM_EMAIL

    const response: EmailSettingsResponse = {
      id: settings.id,
      emailVerificationEnabled: settings.emailVerificationEnabled,
      providerApiKey: maskApiKey(settings.providerApiKey),
      providerBaseUrl: settings.providerBaseUrl,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      hasApiKey: !!(settings.providerApiKey || hasEnvApiKey),
      isConfigured: !!(
        (settings.providerApiKey || hasEnvApiKey) &&
        (settings.fromEmail || hasEnvFromEmail)
      ),
    }

    return NextResponse.json(response)
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'UpdateEmailSettings')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
