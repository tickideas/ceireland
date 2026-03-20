import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { updateUserSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, ConflictError, NotFoundError, errorToResponse, logError } from '@/lib/errors'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const { id } = await params
    if (!id) {
      const err = new ValidationError('User ID is required')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const body = await request.json()
    const validation = safeValidate(updateUserSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const data = Object.fromEntries(
      Object.entries(validation.data).filter(([, value]) => value !== undefined)
    )

    if (Object.keys(data).length === 0) {
      const err = new ValidationError('No fields to update')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    if (typeof data.email === 'string') {
      const exists = await prisma.user.findFirst({ where: { email: data.email, NOT: { id } } })
      if (exists) {
        const err = new ConflictError('Email already in use')
        return NextResponse.json(errorToResponse(err), { status: err.statusCode })
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
    const err = error instanceof Error ? error : new Error('Unknown error')
    if ((err as { code?: string }).code === 'P2025') {
      const notFound = new NotFoundError('Member not found')
      return NextResponse.json(errorToResponse(notFound), { status: notFound.statusCode })
    }
    logError(err, 'AdminUserUpdate')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const { id } = await params
    if (!id) {
      const err = new ValidationError('User ID is required')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      const err = new NotFoundError('Member not found')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    if (user.role === 'ADMIN') {
      const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', NOT: { id } } })
      if (otherAdmins === 0) {
        const err = new ValidationError('Cannot delete the last admin user')
        return NextResponse.json(errorToResponse(err), { status: err.statusCode })
      }
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ message: 'User deleted' })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminUserDelete')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
