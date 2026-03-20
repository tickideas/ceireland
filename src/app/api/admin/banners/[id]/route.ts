import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { updateBannerSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse, logError } from '@/lib/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const body = await request.json()
    const validation = safeValidate(updateBannerSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { id } = await params
    if (!id) {
      const err = new ValidationError('Banner ID is required')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const banner = await prisma.banner.update({
      where: { id },
      data: validation.data
    })

    return NextResponse.json({
      message: 'Banner updated successfully',
      banner
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminBannerUpdate')
    return NextResponse.json(errorToResponse(err), { status: 500 })
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
      const err = new ValidationError('Banner ID is required')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    await prisma.banner.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Banner deleted successfully' })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminBannerDelete')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
