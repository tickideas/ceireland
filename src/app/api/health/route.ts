import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRateLimitStoreSize } from '@/lib/rateLimit'

/**
 * Health check endpoint
 * Returns service status and health metrics
 * 
 * Used for:
 * - Monitoring/alerting systems
 * - Load balancers
 * - Status pages
 * 
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now()
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: { status: 'unknown' as 'ok' | 'error' | 'unknown', responseTime: 0, error: '' },
      memory: { status: 'ok' as 'ok' | 'warning' | 'critical', usage: 0, limit: 0, percentage: 0 },
      rateLimit: { status: 'ok' as 'ok' | 'warning', storeSize: 0 },
    },
    responseTime: 0,
  }

  // Check database connectivity
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1 as health`
    const dbTime = Date.now() - dbStart
    checks.checks.database = {
      status: 'ok',
      responseTime: dbTime,
      error: '',
    }
  } catch (error) {
    checks.checks.database = {
      status: 'error',
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Database connection failed',
    }
    checks.status = 'unhealthy'
  }

  // Check memory usage
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage()
    const usedMB = Math.round(mem.heapUsed / 1024 / 1024)
    const limitMB = Math.round(mem.heapTotal / 1024 / 1024)
    const percentage = Math.round((mem.heapUsed / mem.heapTotal) * 100)

    let memStatus: 'ok' | 'warning' | 'critical' = 'ok'
    if (percentage > 90) {
      memStatus = 'critical'
      checks.status = 'degraded'
    } else if (percentage > 75) {
      memStatus = 'warning'
    }

    checks.checks.memory = {
      status: memStatus,
      usage: usedMB,
      limit: limitMB,
      percentage,
    }
  }

  // Check rate limit store size
  const rateLimitSize = getRateLimitStoreSize()
  let rateLimitStatus: 'ok' | 'warning' = 'ok'
  if (rateLimitSize > 1000) {
    rateLimitStatus = 'warning'
  }
  checks.checks.rateLimit = {
    status: rateLimitStatus,
    storeSize: rateLimitSize,
  }

  // Calculate total response time
  checks.responseTime = Date.now() - startTime

  // Determine HTTP status code
  let statusCode = 200
  if (checks.status === 'unhealthy') {
    statusCode = 503 // Service Unavailable
  } else if (checks.status === 'degraded') {
    statusCode = 200 // Still serving, but with warnings
  }

  return NextResponse.json(checks, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
