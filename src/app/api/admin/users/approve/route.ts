import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { sendApprovalNotification } from '@/lib/email'

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, approved } = await request.json()

    if (!userId || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

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
        console.error('Failed to send approval notification email:', emailError)
        // Don't fail the approval if email fails
      }
    }

    return NextResponse.json({ 
      message: `Member ${approved ? 'approved' : 'rejected'} successfully`,
      user 
    })
  } catch (error) {
    console.error('Update user approval error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}