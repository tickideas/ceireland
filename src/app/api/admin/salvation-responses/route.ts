import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { errorResponse } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit
    const showFollowedUp = searchParams.get('showFollowedUp') === 'true'

    const where = showFollowedUp ? {} : { followedUp: false }

    const [responses, total, pendingCount] = await Promise.all([
      prisma.salvationResponse.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.salvationResponse.count({ where }),
      prisma.salvationResponse.count({
        where: { followedUp: false }
      })
    ])

    return NextResponse.json({
      responses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      pendingCount
    })
  } catch (error) {
    return errorResponse(error, 'AdminSalvationResponsesList')
  }
}
