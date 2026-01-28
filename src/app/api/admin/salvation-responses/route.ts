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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const showFollowedUp = searchParams.get('showFollowedUp') === 'true'

    const where = showFollowedUp ? {} : { followedUp: false }

    const [responses, total] = await Promise.all([
      prisma.salvationResponse.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.salvationResponse.count({ where })
    ])

    const pendingCount = await prisma.salvationResponse.count({
      where: { followedUp: false }
    })

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
    console.error('Error fetching salvation responses:', error)
    return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 })
  }
}
