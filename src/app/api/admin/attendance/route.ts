import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function parseDateParam(value: string | null): Date {
  if (!value) return new Date()
  // Expecting YYYY-MM-DD; fallback to Date parse if needed
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const [, y, mo, d] = m
    return new Date(Number(y), Number(mo) - 1, Number(d))
  }
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function toCsvValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const format = searchParams.get('format') || 'json'

    const date = parseDateParam(dateParam)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    // Find all services on that day
    const services = await prisma.service.findMany({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      select: { id: true, title: true, date: true }
    })

    const serviceIds = services.map((s) => s.id)

    // If no services that day, return empty
    if (serviceIds.length === 0) {
      if (format === 'csv') {
        const headers = [
          'Service Title',
          'Service Date',
          'User Title',
          'First Name',
          'Last Name',
          'Email',
          'Phone',
          'Check-in Time'
        ]
        const csv = headers.join(',') + '\n'
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="attendance_${dayStart.toISOString().slice(0, 10)}.csv"`
          }
        })
      }
      return NextResponse.json({ date: dayStart, records: [] })
    }

    // Get attendance + joined user/service info
    const attendance = await prisma.attendance.findMany({
      where: { serviceId: { in: serviceIds } },
      include: {
        user: { select: { title: true, name: true, lastName: true, email: true, phone: true } },
        service: { select: { title: true, date: true } }
      },
      orderBy: [
        { service: { date: 'asc' } },
        { checkInTime: 'asc' }
      ]
    })

    const records = attendance.map((a) => ({
      serviceTitle: a.service.title,
      serviceDate: a.service.date,
      userTitle: a.user.title || '',
      firstName: a.user.name,
      lastName: a.user.lastName,
      email: a.user.email,
      phone: a.user.phone || '',
      checkInTime: a.checkInTime
    }))

    if (format === 'csv') {
      const headers = [
        'Service Title',
        'Service Date',
        'User Title',
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Check-in Time'
      ]
      const rows = records.map((r) => [
        toCsvValue(r.serviceTitle),
        toCsvValue(new Date(r.serviceDate).toISOString()),
        toCsvValue(r.userTitle),
        toCsvValue(r.firstName),
        toCsvValue(r.lastName),
        toCsvValue(r.email),
        toCsvValue(r.phone),
        toCsvValue(new Date(r.checkInTime).toISOString())
      ].join(','))
      const csv = [headers.join(','), ...rows].join('\n') + '\n'
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="attendance_${dayStart.toISOString().slice(0, 10)}.csv"`
        }
      })
    }

    return NextResponse.json({ date: dayStart, records })
  } catch (error) {
    console.error('Get attendance report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

