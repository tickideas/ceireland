/**
 * Removes accounts created by the registration spam flood.
 *
 * A row is deleted only when ALL of the following hold:
 *   1. role is USER            - admins are never touched
 *   2. emailVerified is false  - anyone who clicked through is a real person
 *   3. a name field fails isNameSafe() - the rule the API now enforces
 *   4. createdAt is inside --created-after/--created-before, when given
 *
 * Conditions 3 and 4 are ANDed deliberately. The name rule alone catches
 * legitimate old accounts whose names predate the rule (e.g. an underscore in
 * a branch account). A date window alone deletes genuine people who signed up
 * while the flood was running. Requiring both spares each of them.
 *
 * Dry run by default. Deletion needs --apply.
 *
 *   node scripts-dist/purge-spam-signups.cjs \
 *     --created-after=2026-07-25 --created-before=2026-07-27
 *   node scripts-dist/purge-spam-signups.cjs \
 *     --created-after=2026-07-25 --created-before=2026-07-27 --apply
 *
 * User relations are ON DELETE CASCADE / SET NULL, so dependent rows are
 * cleaned up by the database.
 */

import { PrismaClient } from '@prisma/client'
import { isNameSafe } from '../src/lib/validation'

const prisma = new PrismaClient()

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')
const SAMPLE_SIZE = 10
const FETCH_PAGE_SIZE = 5_000
const DELETE_BATCH_SIZE = 500

/**
 * Refuse to delete more than this share of the user table unless --force is
 * given. A flood can legitimately exceed it, so this is a prompt to verify the
 * report rather than a hard stop.
 */
const SANITY_THRESHOLD = 0.9

type Candidate = {
  id: string
  title: string | null
  name: string
  lastName: string
  email: string
  createdAt: Date
}

function parseDateFlag(flag: string): Date | null {
  const raw = process.argv.find((arg) => arg.startsWith(`--${flag}=`))?.split('=')[1]
  if (!raw) return null

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    console.error(`Invalid --${flag}: ${raw}. Use an ISO date, e.g. 2026-07-25.`)
    process.exit(1)
  }
  return parsed
}

function hasUnsafeName(user: Candidate): boolean {
  return [user.title, user.name, user.lastName].some(
    (field) => field !== null && field !== '' && !isNameSafe(field)
  )
}

function day(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function describe(user: Candidate): string {
  const fullName = [user.title, user.name, user.lastName].filter(Boolean).join(' ')
  return `    ${day(user.createdAt)}  ${user.email.slice(0, 38).padEnd(38)}  ${JSON.stringify(fullName).slice(0, 58)}`
}

/** Streams candidates in pages so a very large table is never fully resident. */
async function* candidatePages() {
  let cursor: string | undefined

  for (;;) {
    const page: Candidate[] = await prisma.user.findMany({
      where: { role: 'USER', emailVerified: false },
      select: { id: true, title: true, name: true, lastName: true, email: true, createdAt: true },
      orderBy: { id: 'asc' },
      take: FETCH_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })

    if (page.length === 0) return
    yield page
    if (page.length < FETCH_PAGE_SIZE) return
    cursor = page[page.length - 1].id
  }
}

async function main() {
  const createdAfter = parseDateFlag('created-after')
  const createdBefore = parseDateFlag('created-before')
  const windowed = Boolean(createdAfter || createdBefore)

  const totalUsers = await prisma.user.count()

  const doomedIds: string[] = []
  const samples = { doomed: [] as Candidate[], sparedByWindow: [] as Candidate[], sparedByName: [] as Candidate[] }
  const perDay = new Map<string, { total: number; doomed: number }>()
  let candidates = 0
  let sparedByWindow = 0
  let sparedByName = 0

  for await (const page of candidatePages()) {
    for (const user of page) {
      candidates += 1

      const bucket = perDay.get(day(user.createdAt)) ?? { total: 0, doomed: 0 }
      bucket.total += 1

      const inWindow =
        (!createdAfter || user.createdAt >= createdAfter) &&
        (!createdBefore || user.createdAt < createdBefore)
      const unsafeName = hasUnsafeName(user)

      if (unsafeName && inWindow) {
        doomedIds.push(user.id)
        bucket.doomed += 1
        if (samples.doomed.length < SAMPLE_SIZE) samples.doomed.push(user)
      } else if (unsafeName && !inWindow) {
        // Matches the name rule but sits outside the flood window - the class
        // of row that would be lost if the name rule were used on its own.
        sparedByWindow += 1
        if (samples.sparedByWindow.length < SAMPLE_SIZE) samples.sparedByWindow.push(user)
      } else if (inWindow) {
        // Inside the flood window but the name looks genuine - the class of row
        // that would be lost if a date window were used on its own.
        sparedByName += 1
        if (samples.sparedByName.length < SAMPLE_SIZE) samples.sparedByName.push(user)
      }

      perDay.set(day(user.createdAt), bucket)
    }
  }

  console.log(`\nMode              : ${APPLY ? 'APPLY (destructive)' : 'DRY RUN'}`)
  console.log(`Window            : ${windowed
    ? `${createdAfter ? createdAfter.toISOString() : '-inf'} .. ${createdBefore ? createdBefore.toISOString() : '+inf'}`
    : 'none (name rule only)'}`)
  console.log(`Total users       : ${totalUsers}`)
  console.log(`Unverified USERs  : ${candidates}`)
  console.log(`TO DELETE         : ${doomedIds.length}`)

  console.log('\nSignups per day (unverified USERs):')
  const days = [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b))
  const shown = days.length > 12 ? [...days.slice(0, 4), null, ...days.slice(-4)] : days
  for (const entry of shown) {
    if (!entry) {
      console.log('    ...')
      continue
    }
    const [date, counts] = entry
    console.log(`    ${date}  total ${String(counts.total).padStart(7)}   delete ${String(counts.doomed).padStart(7)}`)
  }

  if (doomedIds.length > 0) {
    console.log(`\nWill DELETE (sample of ${doomedIds.length}):`)
    samples.doomed.forEach((u) => console.log(describe(u)))
  }

  if (sparedByWindow > 0) {
    console.log(`\nSPARED - unsafe name but outside the window (${sparedByWindow}):`)
    console.log('  These would be lost if the name rule ran without a date window.')
    samples.sparedByWindow.forEach((u) => console.log(describe(u)))
  }

  if (sparedByName > 0) {
    console.log(`\nSPARED - inside the window but the name looks genuine (${sparedByName}):`)
    console.log('  These would be lost if a date window ran without the name rule.')
    samples.sparedByName.forEach((u) => console.log(describe(u)))
  }

  if (doomedIds.length === 0) {
    console.log('\nNothing to do.\n')
    return
  }

  const share = totalUsers === 0 ? 0 : doomedIds.length / totalUsers
  if (share > SANITY_THRESHOLD && !FORCE) {
    console.log(
      `\nHOLD: ${(share * 100).toFixed(1)}% of the user table is selected.` +
        '\nThat is expected when a flood dwarfs real signups, but check the report above first:' +
        '\n  - does the per-day table match the known attack window?' +
        '\n  - do the SPARED lists contain the accounts you expect to keep?' +
        '\nRe-run with --force (plus --apply) once satisfied.\n'
    )
    process.exitCode = 1
    return
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to delete.\n')
    return
  }

  console.log(`\nDeleting ${doomedIds.length} users...`)
  let deleted = 0
  for (let i = 0; i < doomedIds.length; i += DELETE_BATCH_SIZE) {
    const batch = doomedIds.slice(i, i + DELETE_BATCH_SIZE)
    const result = await prisma.user.deleteMany({ where: { id: { in: batch } } })
    deleted += result.count
    if (deleted % 25_000 < DELETE_BATCH_SIZE || deleted === doomedIds.length) {
      console.log(`  ${deleted}/${doomedIds.length}`)
    }
  }

  // Verification tokens are keyed by email rather than a user FK, so they
  // survive the cascade and are cleared separately. Matching on absence of a
  // user avoids building a 284k-element IN list.
  const orphanTokens = await prisma.$executeRaw`
    DELETE FROM "email_verification_tokens" t
    WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u."email" = t."email")
  `

  console.log(`\nDeleted ${deleted} users and ${orphanTokens} orphaned verification tokens.`)
  console.log(`Remaining users: ${await prisma.user.count()}\n`)
}

main()
  .catch((error) => {
    console.error('\nPurge failed:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
