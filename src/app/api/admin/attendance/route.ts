import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { attendanceQuerySchema } from '@/lib/validation'
import { csvEscape } from '@/lib/csv'
import { endOfDay, parseLocalDate, startOfDay } from '@/lib/dates'

function resolveDate(value: string | null): Date {
  if (!value) return new Date()
  return parseLocalDate(value) ?? new Date()
}

export const GET = adminRoute({ query: attendanceQuerySchema }, async ({ query }) => {
  const date = resolveDate(query.date ?? null)
  const format = query.format
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  const services = await prisma.service.findMany({
    where: { date: { gte: dayStart, lte: dayEnd } },
    select: { id: true, title: true, date: true }
  })

  const serviceIds = services.map((s: { id: string }) => s.id)

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
    return { date: dayStart, records: [] }
  }

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

  const records = attendance.map((a: typeof attendance[number]) => ({
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
    const rows = records.map((r: typeof records[number]) => [
      csvEscape(r.serviceTitle),
      csvEscape(new Date(r.serviceDate).toISOString()),
      csvEscape(r.userTitle),
      csvEscape(r.firstName),
      csvEscape(r.lastName),
      csvEscape(r.email),
      csvEscape(r.phone),
      csvEscape(new Date(r.checkInTime).toISOString())
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

  return { date: dayStart, records }
})
