/**
 * Removes accounts created by the registration spam flood.
 *
 * A row is treated as spam only when ALL of the following hold:
 *   1. role is USER          - admins are never touched
 *   2. emailVerified is false - anyone who clicked through is a real person
 *   3. a name field fails isNameSafe() - the exact rule the API now enforces
 *
 * Dry run by default. Pass --apply to actually delete.
 *
 *   npx tsx scripts/purge-spam-signups.ts
 *   npx tsx scripts/purge-spam-signups.ts --apply
 *
 * User relations are ON DELETE CASCADE / SET NULL in the schema, so attendance
 * and viewer-session rows are cleaned up by the database.
 */

import { PrismaClient } from '@prisma/client'
import { isNameSafe } from '../src/lib/validation'

const prisma = new PrismaClient()

const APPLY = process.argv.includes('--apply')
const SAMPLE_SIZE = 15
const DELETE_BATCH_SIZE = 500

/** Fraction of the user table above which we refuse to proceed unattended. */
const SANITY_THRESHOLD = 0.9

type Candidate = {
  id: string
  title: string | null
  name: string
  lastName: string
  email: string
  phone: string | null
  createdAt: Date
}

function isSpam(user: Candidate): boolean {
  const fields = [user.title, user.name, user.lastName]
  return fields.some((field) => field !== null && field !== '' && !isNameSafe(field))
}

function describe(user: Candidate): string {
  const fullName = [user.title, user.name, user.lastName].filter(Boolean).join(' ')
  const when = user.createdAt.toISOString().slice(0, 10)
  return `  ${when}  ${user.email.padEnd(34)}  ${JSON.stringify(fullName).slice(0, 70)}`
}

async function main() {
  const totalUsers = await prisma.user.count()

  const candidates = await prisma.user.findMany({
    where: { role: 'USER', emailVerified: false },
    select: {
      id: true,
      title: true,
      name: true,
      lastName: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  })

  const spam = candidates.filter(isSpam)

  console.log(`\nMode              : ${APPLY ? 'APPLY (destructive)' : 'DRY RUN'}`)
  console.log(`Total users       : ${totalUsers}`)
  console.log(`Unverified USERs  : ${candidates.length}`)
  console.log(`Matching spam     : ${spam.length}`)

  if (spam.length === 0) {
    console.log('\nNothing to do.\n')
    return
  }

  const oldest = spam.reduce((a, b) => (a.createdAt < b.createdAt ? a : b))
  const newest = spam.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
  console.log(`Created between   : ${oldest.createdAt.toISOString()} .. ${newest.createdAt.toISOString()}`)

  console.log(`\nSample (${Math.min(SAMPLE_SIZE, spam.length)} of ${spam.length}):`)
  for (const user of spam.slice(0, SAMPLE_SIZE)) {
    console.log(describe(user))
  }

  const share = totalUsers === 0 ? 0 : spam.length / totalUsers
  if (share > SANITY_THRESHOLD) {
    console.error(
      `\nREFUSING TO PROCEED: ${(share * 100).toFixed(1)}% of all users matched.` +
        `\nThat is high enough to suggest the rule is wrong. Review the sample above.\n`
    )
    process.exitCode = 1
    return
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to delete these rows.\n')
    return
  }

  const ids = spam.map((user) => user.id)
  let deleted = 0
  for (let i = 0; i < ids.length; i += DELETE_BATCH_SIZE) {
    const batch = ids.slice(i, i + DELETE_BATCH_SIZE)
    const result = await prisma.user.deleteMany({ where: { id: { in: batch } } })
    deleted += result.count
    console.log(`  deleted ${deleted}/${ids.length}`)
  }

  // Verification tokens are keyed by email, not by a user FK, so they survive
  // the cascade and must be cleared explicitly.
  const emails = spam.map((user) => user.email)
  let tokensRemoved = 0
  for (let i = 0; i < emails.length; i += DELETE_BATCH_SIZE) {
    const batch = emails.slice(i, i + DELETE_BATCH_SIZE)
    const result = await prisma.emailVerificationToken.deleteMany({
      where: { email: { in: batch } },
    })
    tokensRemoved += result.count
  }

  console.log(`\nDeleted ${deleted} users and ${tokensRemoved} verification tokens.`)
  console.log(`Remaining users: ${await prisma.user.count()}\n`)
}

main()
  .catch((error) => {
    console.error('\nPurge failed:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
