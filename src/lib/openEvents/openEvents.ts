import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import { csvEscape } from '../csv'
import { ValidationError, NotFoundError, ConflictError } from '../errors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const PUBLIC_FIELDS = {
  id: true,
  title: true,
  description: true,
  startDate: true,
  endDate: true,
  isActive: true,
  allowPublic: true,
  createdAt: true,
  updatedAt: true,
} as const

export interface OpenEvent {
  id: string
  title: string
  description: string | null
  startDate: Date
  endDate: Date
  isActive: boolean
  allowPublic: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AttendanceRecord {
  id: string
  sessionId: string | null
  userId: string | null
  checkInTime: Date
  ipAddress: string | null
  userAgent: string | null
  user: { id: string; name: string; email: string } | null
}

export interface OpenEventWithAttendance extends OpenEvent {
  attendance: AttendanceRecord[]
}

export interface CreateInput {
  title: string
  description?: string | null
  startDate: Date
  endDate: Date
  isActive?: boolean
  allowPublic?: boolean
}

export interface UpdateInput {
  title?: string
  description?: string | null
  startDate?: Date
  endDate?: Date
  isActive?: boolean
  allowPublic?: boolean
}

export interface CheckInInput {
  openEventId: string
  userId?: string | null
  sessionId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  /** `true` when the caller has a verified auth token; relaxes the live-window
   * restriction (members may record late attendance). */
  isAuthenticated: boolean
}

export interface CheckInResult {
  alreadyRecorded: boolean
  attendance: {
    id: string
    openEventId: string
    sessionId: string | null
    userId: string | null
    checkInTime: Date
    user: { id: string; name: string; email: string } | null
  }
}

export interface AttendanceSummary {
  event: Pick<OpenEvent, 'id' | 'title' | 'startDate' | 'endDate'>
  totalAttendance: number
  guestCount: number
  memberCount: number
  uniqueDays: number
  days: string[]
}

export interface DailyAttendance {
  event: Pick<OpenEvent, 'id' | 'title' | 'startDate' | 'endDate'>
  dailyBreakdown: { date: string; total: number; guests: number; members: number }[]
  records: Array<{
    id: string
    sessionId: string | null
    userId: string | null
    checkInTime: Date
    ipAddress: string | null
    userAgent: string | null
    user: { id: string; title: string | null; name: string; lastName: string; email: string } | null
  }>
  pagination: { page: number; limit: number; hasMore: boolean }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** The single source of truth for "live right now". Used by SSR and public callers. */
export async function getCurrentLive(): Promise<OpenEvent | null> {
  const now = new Date()
  const found = await prisma.openEvent.findFirst({
    where: liveWindowWhere(now),
    select: PUBLIC_FIELDS,
  })
  return found
}

/** Every currently-live Open Event. Today there is at most one (overlap rule),
 * but the listing endpoint historically returned an array. */
export async function listLive(): Promise<OpenEvent[]> {
  const now = new Date()
  return prisma.openEvent.findMany({
    where: liveWindowWhere(now),
    orderBy: { createdAt: 'desc' },
    select: PUBLIC_FIELDS,
  })
}

/** Admin listing — every Open Event, newest first. */
export async function list(): Promise<OpenEvent[]> {
  return prisma.openEvent.findMany({
    orderBy: { createdAt: 'desc' },
    select: PUBLIC_FIELDS,
  })
}

/** Admin detail view, with attendance records joined for convenience. */
export async function getByIdWithAttendance(id: string): Promise<OpenEventWithAttendance> {
  const event = await prisma.openEvent.findUnique({
    where: { id },
    include: {
      attendance: {
        select: {
          id: true,
          sessionId: true,
          userId: true,
          checkInTime: true,
          ipAddress: true,
          userAgent: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { checkInTime: 'desc' },
      },
    },
  })
  if (!event) {
    throw new NotFoundError('Open event not found')
  }
  return event
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/** Create an Open Event. Rejects overlapping ranges via serializable transaction. */
export async function create(input: CreateInput): Promise<OpenEvent> {
  assertDateOrder(input.startDate, input.endDate)
  return runSerializable(async (tx) => {
    await assertNoOverlap(tx, input.startDate, input.endDate, null)
    return tx.openEvent.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: input.isActive ?? true,
        allowPublic: input.allowPublic ?? true,
      },
      select: PUBLIC_FIELDS,
    })
  })
}

/** Patch-style update. Date-range invariants and overlap re-checked. */
export async function update(id: string, patch: UpdateInput): Promise<OpenEvent> {
  return runSerializable(async (tx) => {
    const existing = await tx.openEvent.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundError('Open event not found')
    }

    const nextStart = patch.startDate ?? existing.startDate
    const nextEnd = patch.endDate ?? existing.endDate
    assertDateOrder(nextStart, nextEnd)
    await assertNoOverlap(tx, nextStart, nextEnd, id)

    return tx.openEvent.update({
      where: { id },
      data: {
        title: patch.title ?? existing.title,
        description: patch.description !== undefined ? patch.description : existing.description,
        startDate: nextStart,
        endDate: nextEnd,
        isActive: patch.isActive ?? existing.isActive,
        allowPublic: patch.allowPublic ?? existing.allowPublic,
      },
      select: PUBLIC_FIELDS,
    })
  })
}

/** Delete an Open Event and its attendance records. */
export async function remove(id: string): Promise<void> {
  const existing = await prisma.openEvent.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw new NotFoundError('Open event not found')
  }
  await prisma.$transaction([
    prisma.openEventAttendance.deleteMany({ where: { openEventId: id } }),
    prisma.openEvent.delete({ where: { id } }),
  ])
}

/**
 * Idempotent check-in. Relies on the `@@unique` constraints in
 * prisma/schema.prisma — a P2002 means "already checked in"; we surface
 * the existing record rather than treating it as an error.
 */
export async function checkIn(input: CheckInInput): Promise<CheckInResult> {
  const event = await prisma.openEvent.findUnique({ where: { id: input.openEventId } })
  if (!event) {
    throw new NotFoundError('Open event not found')
  }

  const now = new Date()
  const inWindow = event.startDate <= now && event.endDate >= now
  if (!inWindow && !input.isAuthenticated) {
    throw new ValidationError('Event is not currently active')
  }

  if (!input.userId && !input.sessionId) {
    throw new ValidationError('A session ID or authenticated user is required')
  }

  try {
    const created = await prisma.openEventAttendance.create({
      data: {
        openEventId: input.openEventId,
        sessionId: input.userId ? null : (input.sessionId ?? null),
        userId: input.userId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
      select: {
        id: true,
        openEventId: true,
        sessionId: true,
        userId: true,
        checkInTime: true,
        user: { select: { id: true, name: true, email: true } },
      },
    })
    return { alreadyRecorded: false, attendance: created }
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      // Idempotent: return the existing record under whichever identity matched.
      const existing = await prisma.openEventAttendance.findFirst({
        where: {
          openEventId: input.openEventId,
          ...(input.userId ? { userId: input.userId } : { sessionId: input.sessionId ?? '' }),
        },
        select: {
          id: true,
          openEventId: true,
          sessionId: true,
          userId: true,
          checkInTime: true,
          user: { select: { id: true, name: true, email: true } },
        },
      })
      if (existing) {
        return { alreadyRecorded: true, attendance: existing }
      }
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function summary(id: string): Promise<AttendanceSummary> {
  const event = await loadEventHeader(id)

  const [total, guests, members] = await Promise.all([
    prisma.openEventAttendance.count({ where: { openEventId: id } }),
    prisma.openEventAttendance.count({ where: { openEventId: id, userId: null } }),
    prisma.openEventAttendance.count({ where: { openEventId: id, userId: { not: null } } }),
  ])

  const uniqueDays = await prisma.$queryRaw<{ date: string }[]>`
    SELECT DISTINCT DATE("checkInTime") as date
    FROM "OpenEventAttendance"
    WHERE "openEventId" = ${id}
    ORDER BY date
  `

  return {
    event,
    totalAttendance: total,
    guestCount: guests,
    memberCount: members,
    uniqueDays: uniqueDays.length,
    days: uniqueDays.map((d) => d.date),
  }
}

export async function daily(
  id: string,
  pagination: { page?: number; limit?: number } = {},
): Promise<DailyAttendance> {
  const event = await loadEventHeader(id)

  const page = Math.max(1, pagination.page ?? 1)
  const limit = Math.min(500, Math.max(1, pagination.limit ?? 100))
  const skip = (page - 1) * limit

  const dailyStats = await prisma.$queryRaw<
    { date: string; total: bigint; guests: bigint; members: bigint }[]
  >`
    SELECT
      DATE("checkInTime") as date,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "userId" IS NULL) as guests,
      COUNT(*) FILTER (WHERE "userId" IS NOT NULL) as members
    FROM "OpenEventAttendance"
    WHERE "openEventId" = ${id}
    GROUP BY DATE("checkInTime")
    ORDER BY date
  `

  const records = await prisma.openEventAttendance.findMany({
    where: { openEventId: id },
    select: {
      id: true,
      sessionId: true,
      userId: true,
      checkInTime: true,
      ipAddress: true,
      userAgent: true,
      user: {
        select: { id: true, title: true, name: true, lastName: true, email: true },
      },
    },
    orderBy: { checkInTime: 'desc' },
    skip,
    take: limit,
  })

  return {
    event,
    dailyBreakdown: dailyStats.map((d) => ({
      date: d.date,
      total: Number(d.total),
      guests: Number(d.guests),
      members: Number(d.members),
    })),
    records,
    pagination: { page, limit, hasMore: records.length === limit },
  }
}

/**
 * Streaming CSV export. Returns an async iterable of pre-formatted CSV
 * chunks (header row + rows in `checkInTime ASC` order) so the route can
 * pipe directly to a `ReadableStream` without buffering the whole table.
 *
 * Each yielded chunk is a complete line (header or row) terminated with `\n`.
 */
export async function* exportCsvStream(id: string): AsyncGenerator<string, void, unknown> {
  const event = await loadEventHeader(id)

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
    'IP Address',
  ]
  yield headers.join(',') + '\n'

  const BATCH_SIZE = 500
  let cursor: string | undefined

  while (true) {
    const batch = await prisma.openEventAttendance.findMany({
      where: { openEventId: id },
      select: {
        id: true,
        sessionId: true,
        userId: true,
        checkInTime: true,
        ipAddress: true,
        user: { select: { title: true, name: true, lastName: true, email: true } },
      },
      orderBy: { checkInTime: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })

    if (batch.length === 0) break

    for (const a of batch) {
      const checkIn = new Date(a.checkInTime)
      const iso = checkIn.toISOString()
      const row = [
        csvEscape(event.title),
        csvEscape(iso.split('T')[0]),
        csvEscape(iso.split('T')[1].split('.')[0]),
        csvEscape(a.userId ? 'Member' : 'Guest'),
        csvEscape(a.user?.title ?? ''),
        csvEscape(a.user?.name ?? ''),
        csvEscape(a.user?.lastName ?? ''),
        csvEscape(a.user?.email ?? ''),
        csvEscape(a.sessionId ?? ''),
        csvEscape(a.ipAddress ?? ''),
      ].join(',')
      yield row + '\n'
    }

    if (batch.length < BATCH_SIZE) break
    cursor = batch[batch.length - 1].id
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

type TxClient = Prisma.TransactionClient

const SERIALIZABLE_RETRY_LIMIT = 3

function liveWindowWhere(now: Date) {
  return {
    isActive: true,
    allowPublic: true,
    startDate: { lte: now },
    endDate: { gte: now },
  } as const
}

function assertDateOrder(start: Date, end: Date): void {
  if (start >= end) {
    throw new ValidationError('End date must be after start date')
  }
}

async function assertNoOverlap(
  tx: TxClient,
  start: Date,
  end: Date,
  excludeId: string | null,
): Promise<void> {
  const overlap = await tx.openEvent.findFirst({
    where: {
      startDate: { lte: end },
      endDate: { gte: start },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  })
  if (overlap) {
    throw new ConflictError('Event overlaps with existing open event')
  }
}

async function runSerializable<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (isSerializationFailure(error) && attempt < SERIALIZABLE_RETRY_LIMIT - 1) {
        continue
      }
      throw error
    }
  }
  // Unreachable — the final attempt either returns or throws above.
  throw new Error('Serializable transaction retry exhausted')
}

function isSerializationFailure(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
  )
}

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  )
}

async function loadEventHeader(
  id: string,
): Promise<Pick<OpenEvent, 'id' | 'title' | 'startDate' | 'endDate'>> {
  const event = await prisma.openEvent.findUnique({
    where: { id },
    select: { id: true, title: true, startDate: true, endDate: true },
  })
  if (!event) {
    throw new NotFoundError('Open event not found')
  }
  return event
}

