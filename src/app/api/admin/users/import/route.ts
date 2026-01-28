import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { Prisma } from '@prisma/client'

interface IncomingUserRow {
  title?: string
  name?: string
  lastName?: string
  email?: string
  phone?: string
  approved?: boolean
}

interface ResultBase { email: string; row: number }
type CreatedResult = ResultBase & { status: 'created'; id: string }
type DuplicateResult = ResultBase & { status: 'duplicate'; id: string }
type ErrorResult = ResultBase & { status: 'error'; message: string }
type RowResult = CreatedResult | DuplicateResult | ErrorResult

export async function POST(request: NextRequest) {
  try {
    // Auth
    const token = request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyToken(token)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse body
    const body = await request.json().catch(() => null)
    const users: IncomingUserRow[] | null = body && body.users
    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: 'Invalid payload: expected { users: [] }' }, { status: 400 })
    }

    const results: RowResult[] = []
    let created = 0
    let duplicates = 0
    let errors = 0

    // Pre-clean & collect desired create data
    const prepared: { row: number; data: { title: string|null; name: string; lastName: string; email: string; phone: string|null; approved: boolean } }[] = []
    const seenEmails = new Set<string>()
    const rawEmails: string[] = []

    users.forEach((raw, idx) => {
      const rowNum = idx + 2 // +2 if header row in CSV, user-friendly numbering
      const email = (raw.email || '').trim().toLowerCase()
      if (!email) {
        results.push({ row: rowNum, email: raw.email || '(missing)', status: 'error', message: 'Email missing' })
        errors++
        return
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        results.push({ row: rowNum, email, status: 'error', message: 'Invalid email format' })
        errors++
        return
      }
      const name = raw.name?.trim()
      const lastName = raw.lastName?.trim()
      if (!name || !lastName) {
        results.push({ row: rowNum, email, status: 'error', message: 'Missing name or lastName' })
        errors++
        return
      }
      if (seenEmails.has(email)) {
        results.push({ row: rowNum, email, status: 'duplicate', id: 'N/A (within file)' })
        duplicates++
        return
      }
      seenEmails.add(email)
      rawEmails.push(email)

      // Phone normalization
      let phone = raw.phone?.trim() || null
      if (phone) {
        const digits = phone.replace(/[^0-9+]/g, '')
        phone = digits.length > 3 ? digits : null // drop placeholder like '0'
      }

      // Approved coercion
      let approved = true
      if (typeof raw.approved === 'string') {
        const approvedStr = (raw.approved as string).trim().toLowerCase()
        if (['false','0','no','n'].includes(approvedStr)) approved = false
        else if (['true','1','yes','y'].includes(approvedStr)) approved = true
      } else if (typeof raw.approved === 'boolean') {
        approved = raw.approved
      }

      prepared.push({
        row: rowNum,
        data: {
          title: raw.title?.trim() || null,
          name,
          lastName,
          email,
          phone,
          approved
        }
      })
    })

    // Query existing duplicates in one go
    const existing = await prisma.user.findMany({ where: { email: { in: rawEmails } }, select: { email: true, id: true } })
    const existingMap = new Map(existing.map(e => [e.email, e.id]))

    const toCreate = prepared.filter(p => !existingMap.has(p.data.email))
    const existingPrepared = prepared.filter(p => existingMap.has(p.data.email))

    existingPrepared.forEach(p => {
      duplicates++
      results.push({ row: p.row, email: p.data.email, status: 'duplicate', id: existingMap.get(p.data.email)! })
    })

    // Batch create using createMany for better performance (reduces round-trips)
    // Configurable chunk size via env (default 100, clamp 10..1000)
    const parsedChunk = parseInt(process.env.BULK_IMPORT_CHUNK_SIZE || '100', 10)
    const CHUNK = Math.min(1000, Math.max(10, isNaN(parsedChunk) ? 100 : parsedChunk))
    
    for (let i = 0; i < toCreate.length; i += CHUNK) {
      const slice = toCreate.slice(i, i + CHUNK)
      if (!slice.length) continue
      
      try {
        // Use createMany with skipDuplicates for efficient bulk insert
        await prisma.user.createMany({
          data: slice.map(s => s.data),
          skipDuplicates: true,
        })
        
        // After createMany, fetch created users to get their IDs
        const createdEmails = slice.map(s => s.data.email)
        const createdUsers = await prisma.user.findMany({
          where: { email: { in: createdEmails } },
          select: { id: true, email: true },
        })
        const createdMap = new Map(createdUsers.map(u => [u.email, u.id]))
        
        for (const meta of slice) {
          const id = createdMap.get(meta.data.email)
          if (id && !existingMap.has(meta.data.email)) {
            created++
            results.push({ row: meta.row, email: meta.data.email, status: 'created', id })
          } else if (!id) {
            // Race condition duplicate
            duplicates++
            results.push({ 
              row: meta.row, 
              email: meta.data.email, 
              status: 'duplicate', 
              id: existingMap.get(meta.data.email) || 'N/A (concurrent duplicate)' 
            })
          }
        }
      } catch (err) {
        console.error('[USER_IMPORT_CHUNK_ERROR]', err)
        
        // Fallback: attempt individual to isolate errors
        for (const s of slice) {
          try {
            const u = await prisma.user.create({ data: s.data })
            created++
            results.push({ row: s.row, email: u.email, status: 'created', id: u.id })
          } catch (inner) {
            errors++
            let message = 'Unknown error'
            if (inner instanceof Prisma.PrismaClientKnownRequestError) {
              if (inner.code === 'P2002') message = 'Unique constraint violation'
              else message = `Prisma error ${inner.code}`
            } else if (inner instanceof Error) message = inner.message
            console.error('[USER_IMPORT_ROW_ERROR]', { email: s.data.email, error: inner })
            results.push({ row: s.row, email: s.data.email, status: 'error', message })
          }
        }
      }
    }

    // Sort results by row for stable display
    results.sort((a, b) => a.row - b.row)

    return NextResponse.json({
      summary: { total: users.length, created, duplicates, errors },
      results
    })
  } catch (e) {
    console.error('[USER_IMPORT_FATAL]', e)
    return NextResponse.json({ error: 'Import handler failed', detail: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}