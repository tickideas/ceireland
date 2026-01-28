'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Calendar, Plus, Edit2, Trash2, Eye, Download, Users, ChevronDown, ChevronUp, X, Loader2, Clock, Globe, Check } from 'lucide-react'

interface OpenEvent {
  id: string
  title: string
  description?: string
  startDate: string
  endDate: string
  isActive: boolean
  allowPublic: boolean
  createdAt: string
  updatedAt: string
}

interface AttendanceSummary {
  totalAttendance: number
  guestCount: number
  memberCount: number
  uniqueDays: number
  days: string[]
}

interface DailyAttendance {
  date: string
  total: number
  guests: number
  members: number
  records: AttendanceRecord[]
}

interface AttendanceRecord {
  id: string
  checkInTime: string
  user?: {
    title?: string
    name: string
    lastName: string
    email: string
  }
}

export default function OpenEventManager() {
  const { loading: userLoading } = useAuth()
  const [openEvents, setOpenEvents] = useState<OpenEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<OpenEvent | null>(null)
  const [attendanceSummaries, setAttendanceSummaries] = useState<Record<string, AttendanceSummary>>({})
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<OpenEvent | null>(null)
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendance[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: false,
    allowPublic: true
  })
  
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userLoading) {
      fetchOpenEvents()
    }
  }, [userLoading])

  const fetchOpenEvents = async () => {
    try {
      setLoadingEvents(true)
      const response = await fetch('/api/open-events')
      if (response.ok) {
        const data = await response.json()
        setOpenEvents(data.openEvents)
        data.openEvents.forEach((event: OpenEvent) => {
          fetchAttendanceSummary(event.id)
        })
      }
    } catch (error) {
      console.error('Error fetching open events:', error)
    } finally {
      setLoadingEvents(false)
    }
  }

  const fetchAttendanceSummary = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/open-events/${eventId}/attendance/summary`)
      if (response.ok) {
        const data = await response.json()
        setAttendanceSummaries(prev => ({
          ...prev,
          [eventId]: data.summary
        }))
      }
    } catch (error) {
      console.error('Error fetching attendance summary:', error)
    }
  }

  const fetchDailyAttendance = async (eventId: string) => {
    try {
      setLoadingAttendance(true)
      const response = await fetch(`/api/admin/open-events/${eventId}/attendance/daily`)
      if (response.ok) {
        const data = await response.json()
        setDailyAttendance(data.dailyBreakdown)
      }
    } catch (error) {
      console.error('Error fetching daily attendance:', error)
    } finally {
      setLoadingAttendance(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    const eventPayload = {
      ...formData,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString()
    }

    try {
      if (selectedEvent) {
        const response = await fetch(`/api/open-events/${selectedEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventPayload)
        })

        if (response.ok) {
          const data = await response.json()
          setOpenEvents(prev => prev.map(event => 
            event.id === selectedEvent.id ? data.openEvent : event
          ))
          closeForm()
        }
      } else {
        const response = await fetch('/api/open-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventPayload)
        })

        if (response.ok) {
          const data = await response.json()
          setOpenEvents(prev => [data.openEvent, ...prev])
          closeForm()
          fetchAttendanceSummary(data.openEvent.id)
        }
      }
    } catch (error) {
      console.error('Error saving open event:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (event: OpenEvent) => {
    setSelectedEvent(event)
    setFormData({
      title: event.title,
      description: event.description || '',
      startDate: new Date(event.startDate).toISOString().split('T')[0],
      endDate: new Date(event.endDate).toISOString().split('T')[0],
      isActive: event.isActive,
      allowPublic: event.allowPublic
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this open event? This will also delete all attendance records.')) {
      return
    }

    try {
      const response = await fetch(`/api/open-events/${eventId}`, { method: 'DELETE' })
      if (response.ok) {
        setOpenEvents(prev => prev.filter(event => event.id !== eventId))
        setAttendanceSummaries(prev => {
          const updated = { ...prev }
          delete updated[eventId]
          return updated
        })
      }
    } catch (error) {
      console.error('Error deleting open event:', error)
    }
  }

  const handleViewAttendance = async (event: OpenEvent) => {
    setSelectedEventForAttendance(event)
    setShowAttendanceModal(true)
    await fetchDailyAttendance(event.id)
  }

  const handleExportCSV = (eventId: string) => {
    const url = `/api/admin/open-events/${eventId}/attendance/export`
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${eventId}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const closeForm = () => {
    setShowCreateForm(false)
    setSelectedEvent(null)
    setFormData({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      isActive: false,
      allowPublic: true
    })
  }

  if (userLoading || loadingEvents) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
          <p className="text-slate-600">Loading open events...</p>
        </div>
      </div>
    )
  }

  const currentEvent = openEvents.find(event => event.isActive)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage public events with guest attendance tracking
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm)
            if (!showCreateForm) {
              setSelectedEvent(null)
              setFormData({
                title: '',
                description: '',
                startDate: '',
                endDate: '',
                isActive: false,
                allowPublic: true
              })
            }
          }}
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/25"
        >
          {showCreateForm ? <X size={18} /> : <Plus size={18} />}
          <span>{showCreateForm ? 'Cancel' : 'Create Event'}</span>
        </button>
      </div>

      {/* Active Event Banner */}
      {currentEvent && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <p className="text-white/80 text-sm">Currently Active Event</p>
                <h3 className="text-xl font-bold">{currentEvent.title}</h3>
                <p className="text-white/80 text-sm mt-1">
                  {new Date(currentEvent.startDate).toLocaleDateString()} - {new Date(currentEvent.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            {attendanceSummaries[currentEvent.id] && (
              <div className="text-right">
                <p className="text-3xl font-bold">{attendanceSummaries[currentEvent.id].totalAttendance}</p>
                <p className="text-white/80 text-sm">Total Attendees</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden" ref={formRef}>
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">
              {selectedEvent ? 'Edit Event' : 'Create New Event'}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Event Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Easter Sunday Service"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the event..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  <Check size={16} className="text-emerald-500" />
                  <span className="text-sm font-medium text-slate-700">Active</span>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, allowPublic: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  <Globe size={16} className="text-blue-500" />
                  <span className="text-sm font-medium text-slate-700">Allow Public Access</span>
                </div>
              </label>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={closeForm}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-lg shadow-blue-500/25"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{selectedEvent ? 'Update Event' : 'Create Event'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events List */}
      {openEvents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No open events yet</h3>
          <p className="text-slate-500 mb-6">Create your first open event to allow public attendance</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            <span>Create Event</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">Period</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Attendance</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {openEvents.map((event) => {
                  const summary = attendanceSummaries[event.id]
                  return (
                    <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            event.isActive ? 'bg-emerald-100' : 'bg-slate-100'
                          }`}>
                            <Calendar className={`w-5 h-5 ${event.isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{event.title}</p>
                            {event.description && (
                              <p className="text-sm text-slate-500 truncate max-w-xs">{event.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                          <Clock size={14} className="text-slate-400" />
                          <span>
                            {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' - '}
                            {new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-fit ${
                            event.isActive 
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {event.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {event.allowPublic && (
                            <span className="inline-flex items-center space-x-1 text-xs text-blue-600">
                              <Globe size={12} />
                              <span>Public</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        {summary ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Users size={14} className="text-slate-400" />
                              <span className="font-medium text-slate-900">{summary.totalAttendance}</span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {summary.guestCount} guests, {summary.memberCount} members
                            </p>
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-slate-200 rounded-full animate-spin border-t-slate-400" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleViewAttendance(event)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Attendance"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleExportCSV(event.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Export CSV"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(event)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedEventForAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => {
            setShowAttendanceModal(false)
            setSelectedEventForAttendance(null)
            setExpandedDay(null)
          }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedEventForAttendance.title}</h3>
                <p className="text-sm text-slate-500">Attendance Details</p>
              </div>
              <button
                onClick={() => {
                  setShowAttendanceModal(false)
                  setSelectedEventForAttendance(null)
                  setExpandedDay(null)
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
              {loadingAttendance ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
                </div>
              ) : dailyAttendance.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No attendance records found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dailyAttendance.map((day) => (
                    <div key={day.date} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex justify-between items-center transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="font-medium text-slate-900">
                            {new Date(day.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-slate-600">
                            <span className="flex items-center space-x-1">
                              <Users size={14} className="text-slate-400" />
                              <span>{day.total}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-slate-500">
                              <span>{day.guests} guests</span>
                              <span>•</span>
                              <span>{day.members} members</span>
                            </span>
                          </div>
                        </div>
                        {expandedDay === day.date ? (
                          <ChevronUp size={18} className="text-slate-500" />
                        ) : (
                          <ChevronDown size={18} className="text-slate-500" />
                        )}
                      </button>
                      
                      {expandedDay === day.date && (
                        <div className="p-4 bg-white">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Time</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {day.records.map((record) => (
                                  <tr key={record.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 text-sm text-slate-700">
                                      {new Date(record.checkInTime).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        record.user ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {record.user ? 'Member' : 'Guest'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-sm text-slate-900">
                                      {record.user ? (
                                        `${record.user.title || ''} ${record.user.name} ${record.user.lastName}`.trim()
                                      ) : (
                                        <span className="text-slate-400">Anonymous</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-slate-600">
                                      {record.user?.email || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end space-x-3">
              <button
                onClick={() => handleExportCSV(selectedEventForAttendance.id)}
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => {
                  setShowAttendanceModal(false)
                  setSelectedEventForAttendance(null)
                  setExpandedDay(null)
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
