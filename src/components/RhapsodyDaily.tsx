"use client"

import { useEffect, useState } from 'react'

type RhapsodyPayload = {
  title: string
  description?: string | null
  scripture?: string | null
  sections: {
    devotional: string[]
    prayer: string[]
    furtherStudy: string[]
  }
  sourceUrl: string
  fetchedAt: string
}

export default function RhapsodyDaily() {
  const [data, setData] = useState<RhapsodyPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      try {
        const isDev = process.env.NODE_ENV !== 'production'
        const url = isDev ? '/api/rhapsody?refresh=1' : '/api/rhapsody'
        const res = await fetch(url, { cache: isDev ? 'no-store' : 'default' })
        if (!res.ok) throw new Error('Failed to load article')
        const json = (await res.json()) as RhapsodyPayload
        setData(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">{error}</div>
    )
  }

  if (!data) return null

  const d = new Date(data.fetchedAt)
  const formattedDate = `${d.getDate()} ${d.toLocaleString(undefined, { month: 'long' })} ${d.getFullYear()}`

  return (
    <aside className="h-full space-y-4 sm:space-y-6">
      <div className="text-center">
        <h3 className="text-sm sm:text-lg font-semibold text-gray-900 line-clamp-2">{data.title || 'Daily Devotional'}</h3>
        <p className="text-xs text-gray-500">{formattedDate}</p>
      </div>

      {data.scripture && (
        <section>
          <h4 className="text-xs font-semibold text-blue-800 tracking-wide uppercase mb-1">Theme Scripture</h4>
          <p className="text-xs sm:text-sm italic text-gray-900 bg-blue-50 rounded-md p-2 sm:p-3">{data.scripture}</p>
        </section>
      )}

      <section>
        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm leading-5 sm:leading-6 text-gray-800">
          {data.sections.devotional.length > 0 ? (
            data.sections.devotional.map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p className="text-gray-500">No devotional content detected today.</p>
          )}
        </div>
      </section>

      <section>
        <h4 className="text-xs sm:text-sm font-semibold text-blue-700 mb-1.5 sm:mb-2">Prayer / Confession</h4>
        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm leading-5 sm:leading-6 text-gray-800">
          {data.sections.prayer.length > 0 ? (
            data.sections.prayer.map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p className="text-gray-500">No prayer section detected.</p>
          )}
        </div>
      </section>

      <section>
        <h4 className="text-xs sm:text-sm font-semibold text-blue-700 mb-1.5 sm:mb-2">Further Study</h4>
        <ul className="list-disc pl-4 sm:pl-5 text-xs sm:text-sm leading-5 sm:leading-6 text-gray-800">
          {data.sections.furtherStudy.length > 0 ? (
            data.sections.furtherStudy.map((p, i) => <li key={i}>{p}</li>)
          ) : (
            <li className="text-gray-500 list-none pl-0">No further study detected.</li>
          )}
        </ul>
      </section>

      <div>
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-blue-600 hover:text-blue-700 active:text-blue-800 text-xs font-medium touch-manipulation"
        >
          Read on Rhapsody →
        </a>
      </div>
    </aside>
  )
}
