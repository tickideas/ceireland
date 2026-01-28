import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { withAccelerate } from '@prisma/extension-accelerate'

// Use Prisma Accelerate when DATABASE_URL uses Prisma scheme (prisma:// or prisma+)
const dbUrl = process.env.DATABASE_URL || ''
const isAccelerate = dbUrl.startsWith('prisma://') || dbUrl.startsWith('prisma+')

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createClient(): PrismaClient {
  if (isAccelerate) {
    // Accelerate manages connections; no adapter/Pool needed
    const base = new PrismaClient()
    return base.$extends(withAccelerate()) as unknown as PrismaClient
  }

  // Direct Postgres via driver adapter with serverless-optimized pool settings
  const pool = new Pool({
    connectionString: dbUrl,
    max: Number(process.env.PG_POOL_MAX || 3), // 2-3 connections per instance for serverless
    idleTimeoutMillis: 5_000, // Close idle connections after 5s
    connectionTimeoutMillis: 10_000, // Fail fast if can't connect in 10s
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
