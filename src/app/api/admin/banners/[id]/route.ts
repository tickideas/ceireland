import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

// Use dynamic route param `id` instead of expecting it in body/query
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, imageUrl, linkUrl, active, order } = await request.json()
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 })
    }

    const updateData: { title?: string; imageUrl?: string; linkUrl?: string; active?: boolean; order?: number } = {}
    if (title !== undefined) updateData.title = title
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl
    if (active !== undefined) updateData.active = active
    if (order !== undefined) updateData.order = order

    const banner = await prisma.banner.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ 
      message: 'Banner updated successfully',
      banner 
    })
  } catch (error) {
    console.error('Update banner error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 })
    }

    await prisma.banner.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Banner deleted successfully' })
  } catch (error) {
    console.error('Delete banner error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
