import test from 'node:test'
import assert from 'node:assert/strict'
import packageJson from '../../../../package.json'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/ceireland_test'

test('health route reports healthy status without false memory degradation', async () => {
  const { clearAllRateLimits } = await import('../../../lib/rateLimit.ts')
  const { prisma } = await import('../../../lib/prisma.ts')
  const { GET } = await import('./route')
  await clearAllRateLimits()

  const originalQueryRaw = prisma.$queryRaw.bind(prisma)
  const originalMemoryUsage = process.memoryUsage
  const originalConstrainedMemory = process.constrainedMemory

  prisma.$queryRaw = (async () => [{ health: 1 }]) as typeof prisma.$queryRaw
  process.memoryUsage = (() => ({
    rss: 128 * 1024 * 1024,
    heapTotal: 64 * 1024 * 1024,
    heapUsed: 60 * 1024 * 1024,
    external: 5 * 1024 * 1024,
    arrayBuffers: 1 * 1024 * 1024,
  })) as typeof process.memoryUsage
  process.constrainedMemory = (() => 0) as typeof process.constrainedMemory

  try {
    const response = await GET()
    const payload = await response.json()

    assert.equal(response.status, 200)
    assert.equal(payload.status, 'healthy')
    assert.equal(payload.version, packageJson.version)
    assert.equal(payload.checks.database.status, 'ok')
    assert.equal(payload.checks.memory.status, 'ok')
    assert.equal(payload.checks.memory.limit, 0)
    assert.equal(payload.checks.memory.percentage, 0)
  } finally {
    prisma.$queryRaw = originalQueryRaw as typeof prisma.$queryRaw
    process.memoryUsage = originalMemoryUsage
    process.constrainedMemory = originalConstrainedMemory
  }
})

test('health route returns 503 when database check fails', async () => {
  const { clearAllRateLimits } = await import('../../../lib/rateLimit.ts')
  const { prisma } = await import('../../../lib/prisma.ts')
  const { GET } = await import('./route')
  await clearAllRateLimits()

  const originalQueryRaw = prisma.$queryRaw.bind(prisma)
  const originalMemoryUsage = process.memoryUsage
  const originalConstrainedMemory = process.constrainedMemory

  prisma.$queryRaw = (async () => {
    throw new Error('Database unavailable')
  }) as typeof prisma.$queryRaw
  process.memoryUsage = (() => ({
    rss: 96 * 1024 * 1024,
    heapTotal: 64 * 1024 * 1024,
    heapUsed: 32 * 1024 * 1024,
    external: 5 * 1024 * 1024,
    arrayBuffers: 1 * 1024 * 1024,
  })) as typeof process.memoryUsage
  process.constrainedMemory = (() => 0) as typeof process.constrainedMemory

  try {
    const response = await GET()
    const payload = await response.json()

    assert.equal(response.status, 503)
    assert.equal(payload.status, 'unhealthy')
    assert.equal(payload.checks.database.status, 'error')
    assert.match(payload.checks.database.error, /Database unavailable/)
    assert.equal(payload.checks.memory.status, 'ok')
  } finally {
    prisma.$queryRaw = originalQueryRaw as typeof prisma.$queryRaw
    process.memoryUsage = originalMemoryUsage
    process.constrainedMemory = originalConstrainedMemory
  }
})
