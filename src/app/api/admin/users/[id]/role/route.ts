import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { userRoleSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, NotFoundError, errorToResponse, logError } from '@/lib/errors'

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
    const validation = safeValidate(userRoleSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { role } = validation.data
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      const err = new NotFoundError('Member not found')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    if (target.role === 'ADMIN' && role === 'USER') {
      const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', NOT: { id } } })
      if (otherAdmins === 0) {
        const err = new ValidationError('Cannot demote the last admin')
        return NextResponse.json(errorToResponse(err), { status: err.statusCode })
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
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminUserRoleUpdate')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
