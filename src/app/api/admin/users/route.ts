import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { paginationSchema, createUserSchema } from '@/lib/validation'
import { ConflictError } from '@/lib/errors'

export const GET = adminRoute({ query: paginationSchema }, async ({ query }) => {
  const { page, pageSize, status, search } = query

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

  return {
    users,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  }
})

export const POST = adminRoute({ body: createUserSchema }, async ({ body }) => {
  const { title, name, lastName, email, phone, approved, role = 'USER' } = body

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new ConflictError('Member with email already exists')
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
})
