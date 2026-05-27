import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken } from '@/lib/auth'
import * as openEvents from '@/lib/openEvents'
import { errorResponse } from '@/lib/errors'

const bodySchema = z.object({
  openEventId: z.string().min(1),
  sessionId: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json().catch(() => null)) as unknown
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 },
      )
    }

    const authToken = request.cookies.get('auth-token')
    let userId: string | null = null
    if (authToken) {
      const payload = verifyToken(authToken.value)
      if (payload) {
        userId = payload.userId
      }
    }

    const result = await openEvents.checkIn({
      openEventId: parsed.data.openEventId,
      sessionId: parsed.data.sessionId,
      ipAddress: parsed.data.ipAddress,
      userAgent: parsed.data.userAgent,
      userId,
      isAuthenticated: userId !== null,
    })

    return NextResponse.json({
      message: result.alreadyRecorded ? 'Attendance already recorded' : 'Attendance recorded successfully',
      attendance: result.attendance,
    })
  } catch (error) {
    return errorResponse(error, 'OpenEventAttendance')
  }
}
