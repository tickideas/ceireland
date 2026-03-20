import { NextResponse } from 'next/server'
import packageJson from '../../../../package.json'
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
    version: packageJson.version,
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

    // RSS reflects the process memory footprint more accurately than heapTotal,
    // which is just the currently allocated V8 heap and not a real host/container limit.
    const usageMB = Math.round(mem.rss / 1024 / 1024)

    const constrainedBytes = typeof process.constrainedMemory === 'function'
      ? process.constrainedMemory()
      : 0
    const limitMB = constrainedBytes > 0 ? Math.round(constrainedBytes / 1024 / 1024) : 0
    const percentage = limitMB > 0
      ? Math.round((usageMB / limitMB) * 100)
      : 0

    let memStatus: 'ok' | 'warning' | 'critical' = 'ok'
    if (limitMB > 0) {
      if (percentage > 90) {
        memStatus = 'critical'
        checks.status = 'degraded'
      } else if (percentage > 75) {
        memStatus = 'warning'
      }
    }

    checks.checks.memory = {
      status: memStatus,
      usage: usageMB,
      limit: limitMB,
      percentage,
    }
  }

  // Check rate limit store size
  const rateLimitSize = await getRateLimitStoreSize()
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
