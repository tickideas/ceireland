/**
 * Clears expired rate-limit records and expired verification tokens.
 *
 * The rate limiter prunes opportunistically at runtime, but only a bounded
 * batch at a time. This drains a large existing backlog in one pass - the
 * signup flood left roughly one rate-limit row per address it tried.
 *
 * Safe to re-run; it only ever removes already-expired rows.
 *
 *   node scripts-dist/cleanup-expired.cjs           # report only
 *   node scripts-dist/cleanup-expired.cjs --apply   # delete
 */

import { PrismaClient } from '@prisma/client'
import { cleanupExpiredTokens } from '../src/lib/emailVerification'

const prisma = new PrismaClient()

const APPLY = process.argv.includes('--apply')
const BATCH_SIZE = 10_000

async function main() {
  const [totalRecords, expiredRecords, totalTokens, expiredTokens] = await Promise.all([
    prisma.rateLimitRecord.count(),
    prisma.rateLimitRecord.count({ where: { resetTime: { lt: new Date() } } }),
    prisma.emailVerificationToken.count(),
    prisma.emailVerificationToken.count({ where: { expiresAt: { lt: new Date() } } }),
  ])

  console.log(`\nMode                     : ${APPLY ? 'APPLY' : 'REPORT ONLY'}`)
  console.log(`rate_limit_records       : ${totalRecords} (${expiredRecords} expired)`)
  console.log(`email_verification_tokens: ${totalTokens} (${expiredTokens} expired)`)

  if (!APPLY) {
    console.log('\nReport only. Re-run with --apply to delete the expired rows.\n')
    return
  }

  if (expiredRecords === 0 && expiredTokens === 0) {
    console.log('\nNothing expired to remove.\n')
    return
  }

  // Deleted in bounded batches so a large backlog never holds a long lock.
  let removedRecords = 0
  for (;;) {
    const deleted = await prisma.$executeRaw`
      DELETE FROM "rate_limit_records"
      WHERE "key" IN (
        SELECT "key" FROM "rate_limit_records"
        WHERE "resetTime" < now()
        LIMIT ${BATCH_SIZE}
      )
    `
    if (deleted === 0) break
    removedRecords += deleted
    console.log(`  rate_limit_records: ${removedRecords}/${expiredRecords}`)
  }

  const removedTokens = await cleanupExpiredTokens()

  console.log(`\nRemoved ${removedRecords} rate-limit records and ${removedTokens} expired tokens.`)
  console.log(`Remaining rate_limit_records: ${await prisma.rateLimitRecord.count()}\n`)
}

main()
  .catch((error) => {
    console.error('\nCleanup failed:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
