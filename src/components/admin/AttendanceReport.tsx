'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, Download, Search, FileText, Clock, Mail, Phone, Loader2, AlertCircle } from 'lucide-react'

type RecordItem = {
  serviceTitle: string
  serviceDate: string
  userTitle: string
  firstName: string
  lastName: string
  email: string
  phone: string
  checkInTime: string
}

export default function AttendanceReport() {
  const [date, setDate] = useState<string>(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [records, setRecords] = useState<RecordItem[]>([])

  const formattedDateLabel = useMemo(() => {
    try {
      const d = new Date(date)
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return date
    }
  }, [date])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/attendance?date=${date}`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      setRecords(data.records || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  function handleDownloadCsv() {
    const url = `/api/admin/attendance?date=${date}&format=csv`
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${date}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mt-1">
            View and export detailed attendance records for any date
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Search size={16} />
                <span>View Report</span>
              </>
            )}
          </button>
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <p className="text-white/80 text-sm">Attendance Report for</p>
            <h2 className="text-xl font-bold">{formattedDateLabel}</h2>
          </div>
          <div className="ml-auto text-right">
            <p className="text-3xl font-bold">{records.length}</p>
            <p className="text-white/80 text-sm">Records found</p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center space-x-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">
                  Service Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden lg:table-cell">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Check-in
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-10 h-10 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
                      <p className="text-slate-500">Loading records...</p>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No attendance records found</p>
                    <p className="text-slate-400 text-sm mt-1">Try selecting a different date</p>
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{r.serviceTitle}</p>
                          <p className="text-xs text-slate-500 md:hidden">
                            {new Date(r.serviceDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-sm text-slate-700">
                        {new Date(r.serviceDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {r.firstName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {r.userTitle} {r.firstName} {r.lastName}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-slate-500 lg:hidden">
                            <Mail size={12} />
                            <span className="truncate max-w-[150px]">{r.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-slate-700">
                          <Mail size={14} className="text-slate-400" />
                          <span>{r.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-slate-500">
                          <Phone size={14} className="text-slate-400" />
                          <span>{r.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Clock size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {new Date(r.checkInTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View */}
      {records.length > 0 && (
        <div className="lg:hidden space-y-4">
          <h3 className="font-semibold text-slate-900">Detailed View</h3>
          {records.map((r, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {r.firstName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {r.userTitle} {r.firstName} {r.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{r.serviceTitle}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(r.checkInTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center space-x-2 text-slate-600">
                  <Mail size={14} className="text-slate-400" />
                  <span className="truncate">{r.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Phone size={14} className="text-slate-400" />
                  <span>{r.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
