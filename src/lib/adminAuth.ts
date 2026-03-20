import { NextRequest } from 'next/server'
import { verifyToken, JWTPayload } from './auth'
import { RATE_LIMITS, checkRateLimit } from './rateLimit'

/**
 * Simplified admin verification that returns a result object
 * instead of NextResponse for easier handling
 */
export async function verifyAdminFromRequest(
  request: NextRequest
): Promise<{ success: true; userId: string; payload: JWTPayload } | { success: false; error: string; status: number }> {
  const authToken = request.cookies.get('auth-token')
  if (!authToken) {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  const payload = verifyToken(authToken.value)
  if (!payload || payload.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  const rateLimit = await checkRateLimit(`admin:${payload.userId}`, RATE_LIMITS.ADMIN)
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error || 'Rate limit exceeded', status: 429 }
  }

  return { success: true, userId: payload.userId, payload }
}
