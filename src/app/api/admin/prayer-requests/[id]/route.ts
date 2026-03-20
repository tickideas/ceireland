import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { ValidationError, NotFoundError, errorToResponse, errorResponse } from '@/lib/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const { id } = await params
    if (!id) {
      const err = new ValidationError('Prayer request ID is required')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const body = await request.json()

    const updated = await prisma.prayerRequest.update({
      where: { id },
      data: {
        isRead: body.isRead,
        isArchived: body.isArchived,
        notes: body.notes
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    if ((err as { code?: string }).code === 'P2025') {
      const notFound = new NotFoundError('Prayer request not found')
      return NextResponse.json(errorToResponse(notFound), { status: notFound.statusCode })
    }
    return errorResponse(error, 'AdminPrayerRequestUpdate')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const { id } = await params
    if (!id) {
      const err = new ValidationError('Prayer request ID is required')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    await prisma.prayerRequest.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    if ((err as { code?: string }).code === 'P2025') {
      const notFound = new NotFoundError('Prayer request not found')
      return NextResponse.json(errorToResponse(notFound), { status: notFound.statusCode })
    }
    return errorResponse(error, 'AdminPrayerRequestDelete')
  }
}
