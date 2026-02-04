'use client'

import { useState, useEffect } from 'react'
import { Radio, Image, Check, X, ExternalLink, Loader2, AlertCircle, Clock, Plus, Trash2, Calendar, Edit2 } from 'lucide-react'

interface StreamSchedule {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  label: string | null
  isActive: boolean
}

interface StreamEvent {
  id: string
  title: string
  startDateTime: string
  endDateTime: string
  isActive: boolean
}

interface StreamSettings {
  streamUrl: string
  posterUrl: string
  isActive: boolean
  scheduledEndTime: string | null
  schedules: StreamSchedule[]
  events: StreamEvent[]
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function StreamManagement() {
  const [settings, setSettings] = useState<StreamSettings>({
    streamUrl: '',
    posterUrl: '',
    isActive: false,
    scheduledEndTime: null,
    schedules: [],
    events: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toggling, setToggling] = useState(false)

  // Schedule form state
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<StreamSchedule | null>(null)
  const [scheduleForm, setScheduleForm] = useState({ dayOfWeek: 0, startTime: '10:00', endTime: '12:00', label: '' })

  // Event form state
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<StreamEvent | null>(null)
  const [eventForm, setEventForm] = useState({ title: '', startDateTime: '', endDateTime: '' })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/stream')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch stream settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch('/api/admin/stream', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamUrl: settings.streamUrl,
          posterUrl: settings.posterUrl,
          isActive: settings.isActive,
          scheduledEndTime: settings.scheduledEndTime
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data }))
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save stream settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleStreamStatus = async () => {
    setToggling(true)
    try {
      const response = await fetch('/api/admin/stream', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, isActive: !settings.isActive })
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error('Failed to toggle stream status:', error)
    } finally {
      setToggling(false)
    }
  }

  // Schedule CRUD
  const handleSaveSchedule = async () => {
    try {
      const url = editingSchedule 
        ? `/api/admin/stream/schedules/${editingSchedule.id}`
        : '/api/admin/stream/schedules'
      
      const response = await fetch(url, {
        method: editingSchedule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm)
      })

      if (response.ok) {
        await fetchSettings()
        setShowScheduleForm(false)
        setEditingSchedule(null)
        setScheduleForm({ dayOfWeek: 0, startTime: '10:00', endTime: '12:00', label: '' })
      }
    } catch (error) {
      console.error('Failed to save schedule:', error)
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return
    
    try {
      const response = await fetch(`/api/admin/stream/schedules/${id}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchSettings()
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error)
    }
  }

  const handleToggleSchedule = async (schedule: StreamSchedule) => {
    try {
      const response = await fetch(`/api/admin/stream/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !schedule.isActive })
      })
      if (response.ok) {
        await fetchSettings()
      }
    } catch (error) {
      console.error('Failed to toggle schedule:', error)
    }
  }

  const openEditSchedule = (schedule: StreamSchedule) => {
    setEditingSchedule(schedule)
    setScheduleForm({
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      label: schedule.label || ''
    })
    setShowScheduleForm(true)
  }

  // Event CRUD
  const handleSaveEvent = async () => {
    try {
      const url = editingEvent
        ? `/api/admin/stream/events/${editingEvent.id}`
        : '/api/admin/stream/events'
      
      const response = await fetch(url, {
        method: editingEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm)
      })

      if (response.ok) {
        await fetchSettings()
        setShowEventForm(false)
        setEditingEvent(null)
        setEventForm({ title: '', startDateTime: '', endDateTime: '' })
      }
    } catch (error) {
      console.error('Failed to save event:', error)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    
    try {
      const response = await fetch(`/api/admin/stream/events/${id}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchSettings()
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const handleToggleEvent = async (event: StreamEvent) => {
    try {
      const response = await fetch(`/api/admin/stream/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !event.isActive })
      })
      if (response.ok) {
        await fetchSettings()
      }
    } catch (error) {
      console.error('Failed to toggle event:', error)
    }
  }

  const openEditEvent = (event: StreamEvent) => {
    setEditingEvent(event)
    setEventForm({
      title: event.title,
      startDateTime: new Date(event.startDateTime).toISOString().slice(0, 16),
      endDateTime: new Date(event.endDateTime).toISOString().slice(0, 16)
    })
    setShowEventForm(true)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  const isEventPast = (event: StreamEvent) => {
    return new Date(event.endDateTime) < new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
          <p className="text-slate-600">Loading stream settings...</p>
        </div>
      </div>
    )
  }

  const upcomingEvents = settings.events.filter(e => !isEventPast(e))
  const pastEvents = settings.events.filter(e => isEventPast(e))

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`relative overflow-hidden rounded-2xl p-6 ${
        settings.isActive 
          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
          : 'bg-gradient-to-br from-slate-700 to-slate-800'
      }`}>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              settings.isActive ? 'bg-white/20' : 'bg-white/10'
            }`}>
              <Radio className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Live Stream</h2>
              <p className="text-white/80">
                {settings.isActive ? 'Manual override active' : 'Using scheduled times'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {settings.isActive && (
              <span className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-medium text-white">LIVE</span>
              </span>
            )}
            <button
              type="button"
              onClick={toggleStreamStatus}
              disabled={toggling}
              className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                settings.isActive
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-white hover:bg-white/90 text-slate-900'
              } disabled:opacity-50`}
            >
              {toggling ? 'Updating...' : settings.isActive ? 'Disable Override' : 'Force Live'}
            </button>
          </div>
        </div>
        {settings.isActive && (
          <p className="mt-4 text-white/70 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            Manual override is ON. Schedules are ignored until you disable it.
          </p>
        )}
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5" />
      </div>

      {/* Stream Configuration */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Stream Configuration</h3>
          <p className="text-sm text-slate-500 mt-1">Configure your HLS stream URL and display settings</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Stream URL</label>
            <div className="relative">
              <input
                type="url"
                placeholder="https://example.com/stream.m3u8"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors pr-10"
                value={settings.streamUrl}
                onChange={(e) => setSettings({ ...settings, streamUrl: e.target.value })}
              />
              <Radio className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Poster Image URL</label>
            <div className="relative">
              <input
                type="url"
                placeholder="https://example.com/poster.jpg"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors pr-10"
                value={settings.posterUrl}
                onChange={(e) => setSettings({ ...settings, posterUrl: e.target.value })}
              />
              <Image className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {saved && (
              <div className="flex items-center space-x-2 text-emerald-600">
                <Check size={18} />
                <span className="text-sm font-medium">Settings saved</span>
              </div>
            )}
            {!saved && <div />}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : null}
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Weekly Schedule</h3>
            <p className="text-sm text-slate-500 mt-1">Recurring times when the stream goes live automatically</p>
          </div>
          <button
            onClick={() => {
              setEditingSchedule(null)
              setScheduleForm({ dayOfWeek: 0, startTime: '10:00', endTime: '12:00', label: '' })
              setShowScheduleForm(true)
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} />
            Add Schedule
          </button>
        </div>
        <div className="p-6">
          {settings.schedules.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No schedules configured. Add a schedule to automate your stream.</p>
          ) : (
            <div className="space-y-3">
              {settings.schedules.map((schedule) => (
                <div key={schedule.id} className={`flex items-center justify-between p-4 rounded-xl border ${schedule.isActive ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {DAYS_OF_WEEK[schedule.dayOfWeek]}
                        {schedule.label && <span className="text-slate-500 font-normal"> — {schedule.label}</span>}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSchedule(schedule)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${schedule.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${schedule.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <button onClick={() => openEditSchedule(schedule)} className="p-2 hover:bg-slate-200 rounded-lg">
                      <Edit2 size={16} className="text-slate-500" />
                    </button>
                    <button onClick={() => handleDeleteSchedule(schedule.id)} className="p-2 hover:bg-red-100 rounded-lg">
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* One-off Events */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">One-off Events</h3>
            <p className="text-sm text-slate-500 mt-1">Special events that override the weekly schedule</p>
          </div>
          <button
            onClick={() => {
              setEditingEvent(null)
              setEventForm({ title: '', startDateTime: '', endDateTime: '' })
              setShowEventForm(true)
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} />
            Add Event
          </button>
        </div>
        <div className="p-6">
          {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No events scheduled. Add an event for special services.</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className={`flex items-center justify-between p-4 rounded-xl border ${event.isActive ? 'bg-amber-50 border-amber-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{event.title}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(event.startDateTime).toLocaleDateString()} {new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleEvent(event)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${event.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${event.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <button onClick={() => openEditEvent(event)} className="p-2 hover:bg-slate-200 rounded-lg">
                      <Edit2 size={16} className="text-slate-500" />
                    </button>
                    <button onClick={() => handleDeleteEvent(event.id)} className="p-2 hover:bg-red-100 rounded-lg">
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
              {pastEvents.length > 0 && (
                <details className="mt-4">
                  <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                    {pastEvents.length} past event{pastEvents.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="mt-3 space-y-2">
                    {pastEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 opacity-50">
                        <div>
                          <p className="font-medium text-slate-700 text-sm">{event.title}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(event.startDateTime).toLocaleDateString()}
                          </p>
                        </div>
                        <button onClick={() => handleDeleteEvent(event.id)} className="p-1.5 hover:bg-red-100 rounded">
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">{editingSchedule ? 'Edit Schedule' : 'Add Schedule'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Day of Week</label>
                <select
                  value={scheduleForm.dayOfWeek}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DAYS_OF_WEEK.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Label (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Sunday Service"
                  value={scheduleForm.label}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, label: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowScheduleForm(false); setEditingSchedule(null) }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                {editingSchedule ? 'Update' : 'Add'} Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">{editingEvent ? 'Edit Event' : 'Add Event'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g., Christmas Service"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={eventForm.startDateTime}
                  onChange={(e) => setEventForm({ ...eventForm, startDateTime: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={eventForm.endDateTime}
                  onChange={(e) => setEventForm({ ...eventForm, endDateTime: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowEventForm(false); setEditingEvent(null) }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={!eventForm.title || !eventForm.startDateTime || !eventForm.endDateTime}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium"
              >
                {editingEvent ? 'Update' : 'Add'} Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
