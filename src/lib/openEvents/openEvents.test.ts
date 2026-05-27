import test from 'node:test'
import assert from 'node:assert/strict'
import { Prisma } from '@prisma/client'

process.env.NODE_ENV = process.env.NODE_ENV || 'test'
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/ceireland_test'

async function loadModule() {
  // Re-import on every test so monkey-patches on `prisma` don't leak.
  delete require.cache[require.resolve('../prisma')]
  delete require.cache[require.resolve('./openEvents')]
  const { prisma } = await import('../prisma')
  const openEvents = await import('./openEvents')
  return { prisma, openEvents }
}

function makePrismaKnownError(code: string): Error {
  // Prisma's PrismaClientKnownRequestError requires positional args that vary
  // across versions. Instead we build an object whose prototype matches the
  // class — `instanceof` check in the module will pass.
  const err = new Prisma.PrismaClientKnownRequestError('test', {
    code,
    clientVersion: 'test',
  })
  return err
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

test('getCurrentLive filters by isActive, allowPublic, and now ∈ [start, end]', async () => {
  const { prisma, openEvents } = await loadModule()

  let captured: unknown
  prisma.openEvent.findFirst = (async (args: { where: unknown }) => {
    captured = args.where
    return null
  }) as typeof prisma.openEvent.findFirst

  const result = await openEvents.getCurrentLive()

  assert.equal(result, null)
  const where = captured as {
    isActive: boolean
    allowPublic: boolean
    startDate: { lte: Date }
    endDate: { gte: Date }
  }
  assert.equal(where.isActive, true)
  assert.equal(where.allowPublic, true)
  assert.ok(where.startDate.lte instanceof Date)
  assert.ok(where.endDate.gte instanceof Date)
})

test('getByIdWithAttendance throws NotFoundError when missing', async () => {
  const { prisma, openEvents } = await loadModule()
  const { NotFoundError } = await import('../errors')

  prisma.openEvent.findUnique = (async () => null) as typeof prisma.openEvent.findUnique

  await assert.rejects(
    () => openEvents.getByIdWithAttendance('nope'),
    (err: unknown) => err instanceof NotFoundError,
  )
})

// ---------------------------------------------------------------------------
// Commands — create
// ---------------------------------------------------------------------------

test('create rejects when startDate >= endDate (before any DB call)', async () => {
  const { prisma, openEvents } = await loadModule()
  const { ValidationError } = await import('../errors')

  let calledTransaction = false
  prisma.$transaction = (async () => {
    calledTransaction = true
    return null
  }) as unknown as typeof prisma.$transaction

  await assert.rejects(
    () =>
      openEvents.create({
        title: 't',
        startDate: new Date('2030-01-02'),
        endDate: new Date('2030-01-01'),
      }),
    (err: unknown) => err instanceof ValidationError,
  )
  assert.equal(calledTransaction, false, 'rejects before opening a transaction')
})

test('create throws ConflictError when an overlap exists', async () => {
  const { prisma, openEvents } = await loadModule()
  const { ConflictError } = await import('../errors')

  const fakeTx = {
    openEvent: {
      findFirst: async () => ({ id: 'overlap-1' }),
      create: async () => {
        throw new Error('should not reach create()')
      },
    },
  }
  prisma.$transaction = (async (fn: (tx: typeof fakeTx) => Promise<unknown>) =>
    fn(fakeTx)) as unknown as typeof prisma.$transaction

  await assert.rejects(
    () =>
      openEvents.create({
        title: 't',
        startDate: new Date('2030-01-01'),
        endDate: new Date('2030-01-02'),
      }),
    (err: unknown) => err instanceof ConflictError,
  )
})

test('create retries on P2034 serialization failure (bounded)', async () => {
  const { prisma, openEvents } = await loadModule()

  let attempts = 0
  prisma.$transaction = (async () => {
    attempts += 1
    if (attempts < 2) {
      throw makePrismaKnownError('P2034')
    }
    return {
      id: 'oe-1',
      title: 't',
      description: null,
      startDate: new Date('2030-01-01'),
      endDate: new Date('2030-01-02'),
      isActive: true,
      allowPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }) as unknown as typeof prisma.$transaction

  const result = await openEvents.create({
    title: 't',
    startDate: new Date('2030-01-01'),
    endDate: new Date('2030-01-02'),
  })
  assert.equal(attempts, 2)
  assert.equal(result.id, 'oe-1')
})

test('create bubbles non-retriable errors without retrying', async () => {
  const { prisma, openEvents } = await loadModule()

  let attempts = 0
  prisma.$transaction = (async () => {
    attempts += 1
    throw new Error('boom')
  }) as unknown as typeof prisma.$transaction

  await assert.rejects(() =>
    openEvents.create({
      title: 't',
      startDate: new Date('2030-01-01'),
      endDate: new Date('2030-01-02'),
    }),
  )
  assert.equal(attempts, 1)
})

// ---------------------------------------------------------------------------
// Commands — update
// ---------------------------------------------------------------------------

test('update throws NotFoundError when target id is missing', async () => {
  const { prisma, openEvents } = await loadModule()
  const { NotFoundError } = await import('../errors')

  const fakeTx = {
    openEvent: {
      findUnique: async () => null,
      findFirst: async () => null,
      update: async () => {
        throw new Error('should not reach')
      },
    },
  }
  prisma.$transaction = (async (fn: (tx: typeof fakeTx) => Promise<unknown>) =>
    fn(fakeTx)) as unknown as typeof prisma.$transaction

  await assert.rejects(
    () => openEvents.update('missing', { title: 'x' }),
    (err: unknown) => err instanceof NotFoundError,
  )
})

test('update preserves untouched fields when patch is partial', async () => {
  const { prisma, openEvents } = await loadModule()

  const existing = {
    id: 'oe-1',
    title: 'Original',
    description: 'desc',
    startDate: new Date('2030-01-01'),
    endDate: new Date('2030-01-02'),
    isActive: true,
    allowPublic: true,
  }

  let updateCalledWith: { where: { id: string }; data: Record<string, unknown> } | undefined
  const fakeTx = {
    openEvent: {
      findUnique: async () => existing,
      findFirst: async () => null,
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        updateCalledWith = args
        return { ...existing, ...args.data }
      },
    },
  }
  prisma.$transaction = (async (fn: (tx: typeof fakeTx) => Promise<unknown>) =>
    fn(fakeTx)) as unknown as typeof prisma.$transaction

  const result = await openEvents.update('oe-1', { title: 'Renamed' })

  assert.ok(updateCalledWith)
  assert.equal(updateCalledWith!.data.title, 'Renamed')
  assert.equal(updateCalledWith!.data.description, 'desc')
  assert.equal(updateCalledWith!.data.isActive, true)
  assert.equal(result.title, 'Renamed')
})

// ---------------------------------------------------------------------------
// Commands — checkIn (idempotency)
// ---------------------------------------------------------------------------

test('checkIn returns alreadyRecorded=true when P2002 fires (idempotent)', async () => {
  const { prisma, openEvents } = await loadModule()

  prisma.openEvent.findUnique = (async () => ({
    id: 'oe-1',
    title: 't',
    description: null,
    startDate: new Date(Date.now() - 1000),
    endDate: new Date(Date.now() + 1000 * 60 * 60),
    isActive: true,
    allowPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as typeof prisma.openEvent.findUnique

  prisma.openEventAttendance.create = (async () => {
    throw makePrismaKnownError('P2002')
  }) as typeof prisma.openEventAttendance.create

  const existingRecord = {
    id: 'att-1',
    openEventId: 'oe-1',
    sessionId: null,
    userId: 'user-1',
    checkInTime: new Date(),
    user: { id: 'user-1', name: 'A', email: 'a@b.com' },
  }
  prisma.openEventAttendance.findFirst = (async () =>
    existingRecord) as typeof prisma.openEventAttendance.findFirst

  const result = await openEvents.checkIn({
    openEventId: 'oe-1',
    userId: 'user-1',
    isAuthenticated: true,
  })
  assert.equal(result.alreadyRecorded, true)
  assert.equal(result.attendance.id, 'att-1')
})

test('checkIn rejects anonymous guests outside the live window', async () => {
  const { prisma, openEvents } = await loadModule()
  const { ValidationError } = await import('../errors')

  prisma.openEvent.findUnique = (async () => ({
    id: 'oe-1',
    title: 't',
    description: null,
    startDate: new Date('2020-01-01'),
    endDate: new Date('2020-01-02'),
    isActive: true,
    allowPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as typeof prisma.openEvent.findUnique

  await assert.rejects(
    () =>
      openEvents.checkIn({
        openEventId: 'oe-1',
        sessionId: 's-1',
        isAuthenticated: false,
      }),
    (err: unknown) => err instanceof ValidationError,
  )
})

test('checkIn allows authenticated members outside the live window', async () => {
  const { prisma, openEvents } = await loadModule()

  prisma.openEvent.findUnique = (async () => ({
    id: 'oe-1',
    title: 't',
    description: null,
    startDate: new Date('2020-01-01'),
    endDate: new Date('2020-01-02'),
    isActive: true,
    allowPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as typeof prisma.openEvent.findUnique

  prisma.openEventAttendance.create = (async () => ({
    id: 'att-1',
    openEventId: 'oe-1',
    sessionId: null,
    userId: 'user-1',
    checkInTime: new Date(),
    user: { id: 'user-1', name: 'A', email: 'a@b.com' },
  })) as typeof prisma.openEventAttendance.create

  const result = await openEvents.checkIn({
    openEventId: 'oe-1',
    userId: 'user-1',
    isAuthenticated: true,
  })
  assert.equal(result.alreadyRecorded, false)
})

test('checkIn requires either sessionId or userId', async () => {
  const { prisma, openEvents } = await loadModule()
  const { ValidationError } = await import('../errors')

  prisma.openEvent.findUnique = (async () => ({
    id: 'oe-1',
    title: 't',
    description: null,
    startDate: new Date(Date.now() - 1000),
    endDate: new Date(Date.now() + 1000 * 60 * 60),
    isActive: true,
    allowPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as typeof prisma.openEvent.findUnique

  await assert.rejects(
    () => openEvents.checkIn({ openEventId: 'oe-1', isAuthenticated: false }),
    (err: unknown) => err instanceof ValidationError,
  )
})

test('checkIn rejects when event does not exist', async () => {
  const { prisma, openEvents } = await loadModule()
  const { NotFoundError } = await import('../errors')

  prisma.openEvent.findUnique = (async () => null) as typeof prisma.openEvent.findUnique

  await assert.rejects(
    () =>
      openEvents.checkIn({
        openEventId: 'missing',
        userId: 'user-1',
        isAuthenticated: true,
      }),
    (err: unknown) => err instanceof NotFoundError,
  )
})

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

test('exportCsvStream yields header first, then rows in batches, then stops', async () => {
  const { prisma, openEvents } = await loadModule()

  prisma.openEvent.findUnique = (async () => ({
    id: 'oe-1',
    title: 'Annual, Festival',
    description: null,
    startDate: new Date('2030-01-01'),
    endDate: new Date('2030-01-02'),
    isActive: true,
    allowPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as typeof prisma.openEvent.findUnique

  let call = 0
  prisma.openEventAttendance.findMany = (async () => {
    call += 1
    if (call === 1) {
      return [
        {
          id: 'a1',
          sessionId: null,
          userId: 'u1',
          checkInTime: new Date('2030-01-01T10:00:00.000Z'),
          ipAddress: '127.0.0.1',
          user: { title: 'Mr', name: 'Alice', lastName: 'Smith', email: 'a@b.com' },
        },
      ]
    }
    return []
  }) as typeof prisma.openEventAttendance.findMany

  const chunks: string[] = []
  for await (const chunk of openEvents.exportCsvStream('oe-1')) {
    chunks.push(chunk)
  }

  assert.ok(chunks[0].startsWith('Event Title,Check-in Date'))
  // Title is quoted because it contains a comma.
  assert.ok(chunks[1].startsWith('"Annual, Festival",2030-01-01,10:00:00,Member,Mr,Alice,Smith,a@b.com'))
  assert.equal(chunks.length, 2)
})
