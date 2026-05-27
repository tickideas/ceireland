'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, Mail, Phone, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

interface SalvationResponse {
  id: string
  name: string
  email: string
  phone: string | null
  followedUp: boolean
  followUpNotes: string | null
  createdAt: string
}

interface SalvationTabProps {
  /** Called whenever the salvation list refreshes, so the parent's nav badge stays in sync. */
  onPendingCountChange?: (count: number) => void
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

export default function SalvationTab({ onPendingCountChange }: SalvationTabProps) {
  const [salvationResponses, setSalvationResponses] = useState<SalvationResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [showFollowedUp, setShowFollowedUp] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Store the callback in a ref so callers don't have to memoise it. See
  // PrayersTab for the rationale — keeps fetch's dep array narrow and lets
  // parents pass inline arrows without triggering refetches on every render.
  const onPendingCountChangeRef = useRef(onPendingCountChange)
  useEffect(() => {
    onPendingCountChangeRef.current = onPendingCountChange
  }, [onPendingCountChange])

  const fetchSalvationResponses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/salvation-responses?showFollowedUp=${showFollowedUp}`)
      if (res.ok) {
        const data = await res.json()
        setSalvationResponses(data.responses)
        setPendingCount(data.pendingCount)
        onPendingCountChangeRef.current?.(data.pendingCount)
      }
    } catch (error) {
      console.error('Error fetching salvation responses:', error)
    } finally {
      setLoading(false)
    }
  }, [showFollowedUp])

  useEffect(() => {
    fetchSalvationResponses()
  }, [fetchSalvationResponses])

  const updateSalvationResponse = async (id: string, updates: Partial<SalvationResponse>) => {
    try {
      const res = await fetch(`/api/admin/salvation-responses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (res.ok) {
        fetchSalvationResponses()
      }
    } catch (error) {
      console.error('Error updating salvation response:', error)
    }
  }

  const deleteSalvationResponse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salvation response?')) return

    try {
      const res = await fetch(`/api/admin/salvation-responses/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchSalvationResponses()
      }
    } catch (error) {
      console.error('Error deleting salvation response:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Salvation Responses
          {pendingCount > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({pendingCount} pending follow-up)
            </span>
          )}
        </h3>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={showFollowedUp}
            onChange={(e) => setShowFollowedUp(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-slate-600">Show followed up</span>
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : salvationResponses.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No salvation responses found
        </div>
      ) : (
        <div className="space-y-3">
          {salvationResponses.map((response) => (
            <div
              key={response.id}
              className={`border rounded-lg overflow-hidden transition-colors ${
                response.followedUp
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpanded(expanded === response.id ? null : response.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{response.name}</span>
                      {response.followedUp ? (
                        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={10} />
                          Followed Up
                        </span>
                      ) : (
                        <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Mail size={14} />
                        {response.email}
                      </span>
                      {response.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={14} />
                          {response.phone}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      {formatDate(response.createdAt)}
                    </div>
                  </div>
                  <div className="ml-4">
                    {expanded === response.id ? (
                      <ChevronUp size={20} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {expanded === response.id && (
                <div className="px-4 pb-4 border-t border-slate-200 bg-white">
                  <div className="pt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Follow-up Notes
                      </label>
                      <textarea
                        value={response.followUpNotes || ''}
                        onChange={(e) => {
                          setSalvationResponses(
                            salvationResponses.map((r) =>
                              r.id === response.id ? { ...r, followUpNotes: e.target.value } : r
                            )
                          )
                        }}
                        placeholder="Add notes about follow-up actions..."
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() =>
                          updateSalvationResponse(response.id, {
                            followedUp: !response.followedUp,
                            followUpNotes: response.followUpNotes
                          })
                        }
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg ${
                          response.followedUp
                            ? 'border border-amber-300 text-amber-600 hover:bg-amber-50'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        <Check size={14} />
                        {response.followedUp ? 'Mark Pending' : 'Mark Followed Up'}
                      </button>
                      <button
                        onClick={() => {
                          const notes = salvationResponses.find((r) => r.id === response.id)?.followUpNotes
                          updateSalvationResponse(response.id, { followUpNotes: notes })
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        Save Notes
                      </button>
                      <button
                        onClick={() => deleteSalvationResponse(response.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
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
