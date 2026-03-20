import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { paginationSchema, safeValidate, formatZodErrors, createUserSchema } from '@/lib/validation'
import { ValidationError, ConflictError, errorToResponse, errorResponse } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const { searchParams } = new URL(request.url)
    const validation = safeValidate(
      paginationSchema,
      Object.fromEntries(searchParams.entries())
    )

    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { page, pageSize, status, search } = validation.data

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
    return errorResponse(error, 'AdminUsersList')
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const body = await request.json()
    const validation = safeValidate(createUserSchema, body)

    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { title, name, lastName, email, phone, approved, role = 'USER' } = validation.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      const err = new ConflictError('Member with email already exists')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const user = await prisma.user.create({
      data: {
        title: title ?? null,
        name,
        lastName,
        email,
        phone: phone ?? null,
        role,
        approved: typeof approved === 'boolean' ? approved : role === 'ADMIN'
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
    return errorResponse(error, 'AdminUsersCreate')
  }
}
