import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { bannerSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse, errorResponse } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const banners = await prisma.banner.findMany({
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ banners })
  } catch (error) {
    return errorResponse(error, 'AdminBannersList')
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const body = await request.json()
    const validation = safeValidate(bannerSchema, body)
    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { title, imageUrl, linkUrl, active, order } = validation.data

    const banner = await prisma.banner.create({
      data: {
        title,
        imageUrl,
        linkUrl,
        active,
        order
      }
    })

    return NextResponse.json({
      message: 'Banner created successfully',
      banner
    })
  } catch (error) {
    return errorResponse(error, 'AdminBannerCreate')
  }
}
