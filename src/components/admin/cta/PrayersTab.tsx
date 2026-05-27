'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Mail, Phone, ChevronDown, ChevronUp, Archive, Trash2, Eye, EyeOff } from 'lucide-react'

interface PrayerRequest {
  id: string
  name: string
  email: string | null
  phone: string | null
  request: string
  isRead: boolean
  isArchived: boolean
  notes: string | null
  createdAt: string
}

interface PrayersTabProps {
  /** Called whenever the prayer list refreshes, so the parent's nav badge stays in sync. */
  onUnreadCountChange?: (count: number) => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function PrayersTab({ onUnreadCountChange }: PrayersTabProps) {
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Store the callback in a ref so callers don't have to memoise it. Without
  // this, an inline `<PrayersTab onUnreadCountChange={(c) => ...}/>` would give
  // the prop a new identity on every parent render, refetching prayer requests
  // each time. The ref keeps fetch's dep array narrow.
  const onUnreadCountChangeRef = useRef(onUnreadCountChange)
  useEffect(() => {
    onUnreadCountChangeRef.current = onUnreadCountChange
  }, [onUnreadCountChange])

  const fetchPrayerRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/prayer-requests?includeArchived=${showArchived}`)
      if (res.ok) {
        const data = await res.json()
        setPrayerRequests(data.requests)
        setUnreadCount(data.unreadCount)
        onUnreadCountChangeRef.current?.(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching prayer requests:', error)
    } finally {
      setLoading(false)
    }
  }, [showArchived])

  useEffect(() => {
    fetchPrayerRequests()
  }, [fetchPrayerRequests])

  const updatePrayerRequest = async (id: string, updates: Partial<PrayerRequest>) => {
    try {
      const res = await fetch(`/api/admin/prayer-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (res.ok) {
        fetchPrayerRequests()
      }
    } catch (error) {
      console.error('Error updating prayer request:', error)
    }
  }

  const deletePrayerRequest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prayer request?')) return

    try {
      const res = await fetch(`/api/admin/prayer-requests/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchPrayerRequests()
      }
    } catch (error) {
      console.error('Error deleting prayer request:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Prayer Requests
          {unreadCount > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({unreadCount} unread)
            </span>
          )}
        </h3>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-slate-600">Show archived</span>
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : prayerRequests.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No prayer requests found
        </div>
      ) : (
        <div className="space-y-3">
          {prayerRequests.map((prayer) => (
            <div
              key={prayer.id}
              className={`border rounded-lg overflow-hidden transition-colors ${
                prayer.isArchived
                  ? 'bg-slate-50 border-slate-200'
                  : prayer.isRead
                  ? 'bg-white border-slate-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => {
                  setExpanded(expanded === prayer.id ? null : prayer.id)
                  if (!prayer.isRead) {
                    updatePrayerRequest(prayer.id, { isRead: true })
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{prayer.name}</span>
                      {!prayer.isRead && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                      {prayer.isArchived && (
                        <span className="bg-slate-400 text-white text-xs px-2 py-0.5 rounded-full">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {prayer.request}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>{formatDate(prayer.createdAt)}</span>
                      {prayer.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={12} />
                          {prayer.email}
                        </span>
                      )}
                      {prayer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {prayer.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    {expanded === prayer.id ? (
                      <ChevronUp size={20} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {expanded === prayer.id && (
                <div className="px-4 pb-4 border-t border-slate-200 bg-white">
                  <div className="pt-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Full Request:</h4>
                    <p className="text-slate-600 whitespace-pre-wrap">{prayer.request}</p>
                  </div>

                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => updatePrayerRequest(prayer.id, { isRead: !prayer.isRead })}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      {prayer.isRead ? <EyeOff size={14} /> : <Eye size={14} />}
                      {prayer.isRead ? 'Mark Unread' : 'Mark Read'}
                    </button>
                    <button
                      onClick={() => updatePrayerRequest(prayer.id, { isArchived: !prayer.isArchived })}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      <Archive size={14} />
                      {prayer.isArchived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button
                      onClick={() => deletePrayerRequest(prayer.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
