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
    const status = searchParams.get('status') // 'pending' or 'all'
    const search = (searchParams.get('search') || '').trim()

    interface WhereClause {
      approved?: boolean
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' }
        lastName?: { contains: string; mode: 'insensitive' }
        email?: { contains: string; mode: 'insensitive' }
        phone?: { contains: string; mode: 'insensitive' }
      }>
    }

    const where: WhereClause = status === 'pending' ? { approved: false } : {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Pagination
    const pageParam = parseInt(searchParams.get('page') || '1', 10)
    const sizeParam = parseInt(searchParams.get('pageSize') || '25', 10)
    const page = pageParam > 0 ? pageParam : 1
    const pageSize = Math.min(100, Math.max(5, isNaN(sizeParam) ? 25 : sizeParam))
    const skip = (page - 1) * pageSize

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
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
    ])

    return NextResponse.json({ 
      users,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
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

    const body = await request.json()
    const { title, name, lastName, email, phone, role, approved } = body

    if (!name || !lastName || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (role && !['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Member with email already exists' }, { status: 409 })
    }

    const user = await prisma.user.create({
      data: {
        title: title ?? null,
        name,
        lastName,
        email,
        phone: phone ?? null,
        role: (role ?? 'USER'),
        approved: typeof approved === 'boolean' ? approved : role === 'ADMIN' ? true : false
      },
      select: {
        id: true,
        title: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        approved: true,
        createdAt: true
      }
    })

    return NextResponse.json({ message: 'Member created', user }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
