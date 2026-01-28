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
    const body = await request.json()
    const { title, name, lastName, email, phone, approved } = body

    const data: Record<string, string | boolean | null> = {}
    if (typeof title !== 'undefined') data.title = title
    if (typeof name !== 'undefined') data.name = name
    if (typeof lastName !== 'undefined') data.lastName = lastName
    if (typeof email !== 'undefined') data.email = email
    if (typeof phone !== 'undefined') data.phone = phone
    if (typeof approved === 'boolean') data.approved = approved

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Unique email guard
    if (data.email && typeof data.email === 'string') {
      const exists = await prisma.user.findFirst({ where: { email: data.email, NOT: { id } } })
      if (exists) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
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

    return NextResponse.json({ message: 'Member updated', user })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Guard: prevent deleting the last admin
    if (user.role === 'ADMIN') {
      const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', NOT: { id } } })
      if (otherAdmins === 0) {
        return NextResponse.json({ error: 'Cannot delete the last admin user' }, { status: 400 })
      }
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ message: 'User deleted' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
