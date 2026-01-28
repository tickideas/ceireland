import { NextRequest, NextResponse } from 'next/server'
import { load, CheerioAPI } from 'cheerio'
import type { Element as DOMElement } from 'domhandler'
import { RHAPSODY } from '@/lib/constants'

// Very lightweight HTML cleanup without external deps
function stripScriptsStyles(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
}

function extractBetween(html: string, startPattern: RegExp, endPattern: RegExp) {
  const start = html.search(startPattern)
  if (start === -1) return null
  const rest = html.slice(start)
  const end = rest.search(endPattern)
  if (end === -1) return null
  return rest.slice(0, end)
}

function decodeEntities(text: string) {
  // Minimal entity decoding for common cases
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function normalizeQuotes(s: string) {
  // Normalize curly apostrophes and quotes
  return s
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
}

function getMetaContent(html: string, property: string) {
  const re = new RegExp(`<meta[^>]+property=["']${property}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')
  const m = html.match(re)
  return m?.[1] || null
}

function getTitle(html: string) {
  return (
    getMetaContent(html, 'og:title') ||
    (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null)
  )
}

function toParagraphs(html: string): string[] {
  // Try to find the main article block if present
  let main = extractBetween(html, /<article[^>]*>/i, /<\/article>/i)
  if (!main) {
    // Fall back to <main> block
    main = extractBetween(html, /<main[^>]*>/i, /<\/main>/i)
  }
  const body = main || html
  const cleaned = stripScriptsStyles(body)
  // Replace common block-level tags with paragraph breaks
  let textish = cleaned
    .replace(/<\/(p|div|section|br|h1|h2|h3|h4)>/gi, '</$1>\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '') // drop remaining tags
  textish = decodeEntities(normalizeQuotes(textish))
  // Split into paragraphs, trim empties
  return textish
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean)
}

type Sections = {
  devotional: string[]
  prayer: string[]
  furtherStudy: string[]
}

function extractSections(html: string): Sections {
  const lines = toParagraphs(html)
  const joined = lines.join('\n')

  const find = (re: RegExp) => {
    const m = joined.match(re)
    return m ? m.index ?? -1 : -1
  }

  // Headings may vary slightly, account for curly apostrophes and spacing
  const idxDev = find(/TODAY['’]S\s+DEVOTIONAL/i)
  const idxPrayer = find(/PRAYER\s*(?:\/\s*CONFESSION)?/i)
  const idxFurther = find(/FURTHER\s+STUDY/i)

  const sliceByIdx = (start: number, end: number) => {
    if (start === -1) return []
    const s = joined.slice(start, end === -1 ? undefined : end)
    return s
      .split('\n')
      .slice(1) // drop the heading line
      .map(x => x.trim())
      .filter(Boolean)
  }

  const devotional = sliceByIdx(idxDev, idxPrayer !== -1 ? idxPrayer : (idxFurther !== -1 ? idxFurther : -1))
  const prayer = sliceByIdx(idxPrayer, idxFurther)
  let furtherStudy = sliceByIdx(idxFurther, -1)
  // Trim anything after known end markers
  const endIdx = furtherStudy.findIndex(l => /reading\s+plan|download|change\s+article\s+language|audio/i.test(l))
  if (endIdx !== -1) {
    furtherStudy = furtherStudy.slice(0, endIdx)
  }

  return { devotional, prayer, furtherStudy }
}

// DOM-based extractor using Cheerio for better precision
function extractByHeadings($: CheerioAPI): Sections {
  const normalize = (s: string) => normalizeQuotes(decodeEntities(s)).replace(/\s+/g, ' ').trim()
  const isHeadingText = (s: string) => /^(today['’]s\s+devotional|prayer\s*(?:\/\s*confession)?|further\s+study)$/i.test(s)

  const root = $('article, main').first().length ? $('article, main').first() : $('body')

  let startDev: DOMElement | null = null
  let startPrayer: DOMElement | null = null
  let startFurther: DOMElement | null = null

  root.find('h1,h2,h3,h4,h5,h6,strong,b,p,span').each((_, el) => {
    const text = normalize($(el).text())
    if (!text) return
    if (!startDev && /today['’]s\s+devotional/i.test(text)) startDev = el
    if (!startPrayer && /prayer\s*(?:\/\s*confession)?/i.test(text)) startPrayer = el
    if (!startFurther && /further\s+study/i.test(text)) startFurther = el
  })

  const collect = (start: DOMElement | null) => {
    if (!start) return [] as string[]
    const out: string[] = []
    let node = $(start).next()
    const stopRe = /^(today['’]s\s+devotional|prayer\s*(?:\/\s*confession)?|further\s+study|download|change\s+article\s+language|\d+-year\s+bible\s+reading\s+plan)$/i
    while (node && node.length) {
      const text = normalize(node.text())
      if (isHeadingText(text) || stopRe.test(text)) break
      if (/^home$|^account$|^audio$|^library$/i.test(text)) {
        node = node.next();
        continue
      }
      if (node.is('ul,ol')) {
        node.find('li').each((_, li) => {
          const t = normalize($(li).text())
          if (t) out.push(t)
        })
      } else if (node.is('p,div,blockquote')) {
        if (text) out.push(text)
      }
      node = node.next()
    }
    return out
  }

  return {
    devotional: collect(startDev),
    prayer: collect(startPrayer),
    furtherStudy: collect(startFurther),
  }
}

interface RhapsodyPayload {
  title: string
  description: string | null
  scripture?: string | null
  sections: {
    devotional: string[]
    prayer: string[]
    furtherStudy: string[]
  }
  sourceUrl: string
  fetchedAt: string
}

let cached: { at: number; payload: RhapsodyPayload } | null = null
const DEV = process.env.NODE_ENV !== 'production'
// Use centralized cache TTL from constants
const CACHE_MS = DEV ? 0 : RHAPSODY.CACHE_TTL * 1000 // Convert seconds to milliseconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === '1' || searchParams.get('noCache') === '1'
    const dateParam = (searchParams.get('date') || '').trim()
    const langParam = (searchParams.get('lang') || '').trim()
    // Basic in-memory caching to avoid over-fetching
    if (!forceRefresh && CACHE_MS > 0 && cached && Date.now() - cached.at < CACHE_MS) {
      return NextResponse.json(cached.payload, {
        headers: { 'Cache-Control': 'public, max-age=60' },
      })
    }

    const base = (process.env.RHAPSODY_BASE_URL?.trim() || 'https://read.rhapsodyofrealities.org').replace(/\/$/, '')
    const lang = (process.env.RHAPSODY_LANG?.trim() || langParam || 'english').toLowerCase()
    const sourceUrl = base.endsWith('/') ? base.slice(0, -1) : base
    // Try a few candidates: base, AMP, amp query fallback
    // Primary: call the public JSON API first for accurate content
    const today = dateParam || new Date().toISOString().slice(0, 10)
    const apiUrl = `${base}/api/ror-translations/${today}/${encodeURIComponent(lang)}`
    try {
      const apiRes = await fetch(apiUrl, { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } })
      if (apiRes.ok) {
        const data = await apiRes.json()
        const dev = data?.devotionals?.[0]
        if (dev) {
          const title: string = dev.title || 'Rhapsody of Realities'
          const scripture: string = dev.opening_scripture || ''
          const contentBody: string = dev.content_body || ''
          const confession: string = dev.confession_or_prayer || ''
          const further: string = dev.further_study || ''

          const $$ = load(`<div id='wrap'>${contentBody}</div>`)
          let devotionalParas = $$('#wrap').find('p').map((_, el) => $$(el).text().trim()).get().filter(Boolean)

          // Remove scripture duplication if it's included as first paragraph
          const normalizeForCompare = (s: string) => normalizeQuotes(decodeEntities(s)).toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
          const scriptureNorm = scripture ? normalizeForCompare(scripture) : ''
          if (scriptureNorm) {
            devotionalParas = devotionalParas.filter((p, idx) => normalizeForCompare(p) !== scriptureNorm)
          }
          // De-duplicate consecutive identical paragraphs
          const deduped: string[] = []
          let prev = ''
          for (const p of devotionalParas) {
            const n = normalizeForCompare(p)
            if (n === prev) continue
            deduped.push(p)
            prev = n
          }
          devotionalParas = deduped

          const furtherItems = further
            ? further.split(/;|\n|<br\s*\/?\s*>/i).map((s: string) => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean)
            : []

          const payload = {
            title,
            description: null as string | null,
            scripture: scripture || null,
            sections: {
              devotional: devotionalParas,
              prayer: confession ? [confession] : [],
              furtherStudy: furtherItems,
            },
            sourceUrl: `${base}`,
            fetchedAt: new Date().toISOString(),
          }

          cached = { at: Date.now(), payload }
          return NextResponse.json(payload, {
            headers: forceRefresh || DEV ? { 'Cache-Control': 'no-store' } : { 'Cache-Control': 'public, max-age=1800' },
          })
        }
      }
    } catch (e) {
      // fall through to HTML scraping if API fails
    }

    const candidates = [
      sourceUrl,
      `${sourceUrl}/`,
      `${sourceUrl}/amp`,
      `${sourceUrl}?amp=1`,
      `${sourceUrl}?output=amp`,
    ]
    let res: Response | null = null
    for (const url of candidates) {
      const r = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; ZChurchBot/1.0)' },
        next: { revalidate: 3600 },
      })
      if (r.ok) { res = r; break }
    }
    if (!res) {
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 })
    }

    const html = await res.text()
    // Use Cheerio for precise section extraction
    const $ = load(html)
    // Drop noisy nodes early
    $('script, style, nav, header, footer').remove()
    const title = getTitle(html) || 'Rhapsody of Realities'
    const description = getMetaContent(html, 'og:description')

    let sections = extractByHeadings($)
    // Fallback: attempt from Next.js data blob
    if (
      sections.devotional.length === 0 &&
      sections.prayer.length === 0 &&
      sections.furtherStudy.length === 0
    ) {
      const nextData = $('script#__NEXT_DATA__').first().text()
      if (nextData) {
        try {
          const flattened = flattenNextDataStrings(nextData)
          const viaText = extractSections(flattened)
          sections = viaText
        } catch (e) {
          // ignore
        }
      }
    }

    const payload = {
      title,
      description,
      sections: {
        devotional: sections.devotional.slice(0, 120),
        prayer: sections.prayer.slice(0, 60),
        furtherStudy: sections.furtherStudy.slice(0, 60),
      },
      sourceUrl,
      fetchedAt: new Date().toISOString(),
    }

    cached = { at: Date.now(), payload }

    return NextResponse.json(payload, {
      headers: forceRefresh || DEV ? { 'Cache-Control': 'no-store' } : { 'Cache-Control': 'public, max-age=1800' },
    })
  } catch (err) {
    console.error('Rhapsody fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function flattenNextDataStrings(nextDataText: string): string {
  const json = JSON.parse(nextDataText)
  const strings: string[] = []
  const walk = (v: unknown): void => {
    if (typeof v === 'string') strings.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(json)
  return strings.join('\n')
}
