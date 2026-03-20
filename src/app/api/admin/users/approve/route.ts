import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { sendApprovalNotification } from '@/lib/email'
import { userApprovalSchema, safeValidate, formatZodErrors } from '@/lib/validation'
import { ValidationError, errorToResponse, logError } from '@/lib/errors'

export async function PATCH(request: NextRequest) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const body = await request.json()
    const validation = safeValidate(userApprovalSchema, body)

    if (!validation.success) {
      const err = new ValidationError(formatZodErrors(validation.errors).join(', '))
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const { userId, approved } = validation.data

    const user = await prisma.user.update({
      where: { id: userId },
      data: { approved },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        approved: true
      }
    })

    if (approved) {
      try {
        await sendApprovalNotification(user.email, `${user.name} ${user.lastName}`)
      } catch (emailError) {
        logError(emailError instanceof Error ? emailError : new Error('Approval email failed'), 'ApprovalNotification')
      }
    }

    return NextResponse.json({
      message: `Member ${approved ? 'approved' : 'rejected'} successfully`,
      user
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'AdminUserApproval')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
