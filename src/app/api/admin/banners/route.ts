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

    const banners = await prisma.banner.findMany({
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ banners })
  } catch (error) {
    console.error('Get admin banners error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, imageUrl, linkUrl, active = true, order = 0 } = await request.json()

    if (!title || !imageUrl) {
      return NextResponse.json({ error: 'Title and image URL are required' }, { status: 400 })
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        imageUrl,
        linkUrl,
        active,
        order
      }
    })

    return NextResponse.json({ 
      message: 'Banner created successfully',
      banner 
    })
  } catch (error) {
    console.error('Create banner error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}