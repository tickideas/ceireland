import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { sendApprovalNotification } from '@/lib/email'
import { userApprovalSchema } from '@/lib/validation'
import { logError } from '@/lib/errors'

export const PATCH = adminRoute({ body: userApprovalSchema }, async ({ body }) => {
  const { userId, approved } = body

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

  return {
    message: `Member ${approved ? 'approved' : 'rejected'} successfully`,
    user
  }
})
