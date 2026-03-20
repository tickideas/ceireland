import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminFromRequest } from '@/lib/adminAuth'
import { NotFoundError, errorToResponse, logError } from '@/lib/errors'

function toCsvValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdminFromRequest(request)
    if (!adminResult.success) {
      return NextResponse.json({ error: adminResult.error }, { status: adminResult.status })
    }

    const resolvedParams = await params
    const { id } = resolvedParams

    const openEvent = await prisma.openEvent.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true
      }
    })

    if (!openEvent) {
      const err = new NotFoundError('Open event not found')
      return NextResponse.json(errorToResponse(err), { status: err.statusCode })
    }

    const eventSlug = openEvent.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30)
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `attendance_${eventSlug}_${dateStr}.csv`

    const headers = [
      'Event Title',
      'Check-in Date',
      'Check-in Time',
      'User Type',
      'Title',
      'First Name',
      'Last Name',
      'Email',
      'Session ID',
      'IP Address'
    ]

    const BATCH_SIZE = 500
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(headers.join(',') + '\n'))

        let cursor: string | undefined
        let hasMore = true

        while (hasMore) {
          const batch = await prisma.openEventAttendance.findMany({
            where: { openEventId: id },
            select: {
              id: true,
              sessionId: true,
              userId: true,
              checkInTime: true,
              ipAddress: true,
              user: {
                select: {
                  title: true,
                  name: true,
                  lastName: true,
                  email: true
                }
              }
            },
            orderBy: { checkInTime: 'asc' },
            take: BATCH_SIZE,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
          })

          if (batch.length === 0) {
            hasMore = false
            break
          }

          for (const a of batch) {
            const checkInDate = new Date(a.checkInTime)
            const userType = a.userId ? 'Member' : 'Guest'

            const row = [
              toCsvValue(openEvent.title),
              toCsvValue(checkInDate.toISOString().split('T')[0]),
              toCsvValue(checkInDate.toISOString().split('T')[1].split('.')[0]),
              toCsvValue(userType),
              toCsvValue(a.user?.title || ''),
              toCsvValue(a.user?.name || ''),
              toCsvValue(a.user?.lastName || ''),
              toCsvValue(a.user?.email || ''),
              toCsvValue(a.sessionId || ''),
              toCsvValue(a.ipAddress || '')
            ].join(',') + '\n'

            controller.enqueue(encoder.encode(row))
          }

          cursor = batch[batch.length - 1].id
          hasMore = batch.length === BATCH_SIZE
        }

        controller.close()
      }
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Transfer-Encoding': 'chunked'
      }
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error')
    logError(err, 'OpenEventAttendanceExport')
    return NextResponse.json(errorToResponse(err), { status: 500 })
  }
}
