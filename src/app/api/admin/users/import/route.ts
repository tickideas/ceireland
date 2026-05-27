import { prisma } from '@/lib/prisma'
import { adminRoute } from '@/lib/adminRoute'
import { bulkUserImportSchema } from '@/lib/validation'
import { logError } from '@/lib/errors'

interface ResultBase { email: string; row: number }
type CreatedResult = ResultBase & { status: 'created'; id: string }
type DuplicateResult = ResultBase & { status: 'duplicate'; id: string }
type ErrorResult = ResultBase & { status: 'error'; message: string }
type RowResult = CreatedResult | DuplicateResult | ErrorResult

export const POST = adminRoute({ body: bulkUserImportSchema }, async ({ body }) => {
    const users = body.users
    const results: RowResult[] = []
    let created = 0
    let duplicates = 0
    let errors = 0

    const prepared: { row: number; data: { title: string | null; name: string; lastName: string; email: string; phone: string | null; approved: boolean } }[] = []
    const seenEmails = new Set<string>()
    const rawEmails: string[] = []

    users.forEach((raw, idx) => {
      const rowNum = idx + 2
      const email = raw.email.trim().toLowerCase()

      if (seenEmails.has(email)) {
        results.push({ row: rowNum, email, status: 'duplicate', id: 'N/A (within file)' })
        duplicates++
        return
      }

      seenEmails.add(email)
      rawEmails.push(email)

      let phone = raw.phone?.trim() || null
      if (phone) {
        const digits = phone.replace(/[^0-9+]/g, '')
        phone = digits.length > 3 ? digits : null
      }

      prepared.push({
        row: rowNum,
        data: {
          title: raw.title?.trim() || null,
          name: raw.name.trim(),
          lastName: raw.lastName.trim(),
          email,
          phone,
          approved: raw.approved ?? false
        }
      })
    })

    const existing = await prisma.user.findMany({
      where: { email: { in: rawEmails } },
      select: { email: true, id: true }
    })
    const existingMap = new Map<string, string>(existing.map((e: { email: string; id: string }) => [e.email, e.id]))

    const toCreate = prepared.filter(p => !existingMap.has(p.data.email))
    const existingPrepared = prepared.filter(p => existingMap.has(p.data.email))

    existingPrepared.forEach(p => {
      duplicates++
      results.push({ row: p.row, email: p.data.email, status: 'duplicate', id: existingMap.get(p.data.email) ?? '' })
    })

    const parsedChunk = parseInt(process.env.BULK_IMPORT_CHUNK_SIZE || '100', 10)
    const CHUNK = Math.min(1000, Math.max(10, Number.isNaN(parsedChunk) ? 100 : parsedChunk))

    for (let i = 0; i < toCreate.length; i += CHUNK) {
      const slice = toCreate.slice(i, i + CHUNK)
      if (!slice.length) continue

      try {
        await prisma.user.createMany({
          data: slice.map(s => s.data),
          skipDuplicates: true,
        })

        const createdEmails = slice.map(s => s.data.email)
        const createdUsers = await prisma.user.findMany({
          where: { email: { in: createdEmails } },
          select: { id: true, email: true },
        })
        const createdMap = new Map<string, string>(createdUsers.map((u: { email: string; id: string }) => [u.email, u.id]))

        for (const meta of slice) {
          const id = createdMap.get(meta.data.email)
          if (id && !existingMap.has(meta.data.email)) {
            created++
            results.push({ row: meta.row, email: meta.data.email, status: 'created', id })
          } else if (!id) {
            duplicates++
            results.push({
              row: meta.row,
              email: meta.data.email,
              status: 'duplicate',
              id: existingMap.get(meta.data.email) ?? 'N/A (concurrent duplicate)'
            })
          }
        }
      } catch (err) {
        logError(err instanceof Error ? err : new Error('User import chunk failed'), 'UserImportChunk')

        for (const s of slice) {
          try {
            const u = await prisma.user.create({ data: s.data })
            created++
            results.push({ row: s.row, email: u.email, status: 'created', id: u.id })
          } catch (inner) {
            errors++
            let message = 'Unknown error'
            if (inner instanceof Error) {
              if ('code' in inner && (inner as { code: string }).code === 'P2002') {
                message = 'Unique constraint violation'
              } else if ('code' in inner) {
                message = `Prisma error ${(inner as { code: string }).code}`
              } else {
                message = inner.message
              }
            }
            logError(inner instanceof Error ? inner : new Error('User import row failed'), 'UserImportRow')
            results.push({ row: s.row, email: s.data.email, status: 'error', message })
          }
        }
      }
    }

    results.sort((a, b) => a.row - b.row)

    return {
      summary: { total: users.length, created, duplicates, errors },
      results
    }
})
