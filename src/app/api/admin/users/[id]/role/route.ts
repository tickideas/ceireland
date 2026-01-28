import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { role } = await request.json()

    if (!['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (target.role === 'ADMIN' && role === 'USER') {
      const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', NOT: { id } } })
      if (otherAdmins === 0) {
        return NextResponse.json({ error: 'Cannot demote the last admin' }, { status: 400 })
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        title: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        approved: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json({ message: 'Role updated', user })
  } catch (error) {
    console.error('Update role error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
