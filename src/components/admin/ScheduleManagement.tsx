'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ChevronUp,
  ChevronDown,
  Eye,
  Calendar,
  Sun,
  Book,
  Heart,
  Star,
  Clock,
  Users,
  X
} from 'lucide-react'

interface ServiceSchedule {
  id: string
  name: string
  description?: string
  time: string
  isActive: boolean
  order: number
  recurrenceType: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
  dayOfWeek?: 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY'
  dayOfMonth?: number
  specificDate?: string
  color: string
  icon: string
}

const COLORS = [
  { value: 'blue', label: 'Blue', bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  { value: 'emerald', label: 'Emerald', bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
  { value: 'amber', label: 'Amber', bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
  { value: 'rose', label: 'Rose', bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
  { value: 'indigo', label: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
  { value: 'teal', label: 'Teal', bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200' },
]

const ICONS = [
  { value: 'sun', label: 'Sun', Icon: Sun },
  { value: 'book', label: 'Book', Icon: Book },
  { value: 'heart', label: 'Heart', Icon: Heart },
  { value: 'star', label: 'Star', Icon: Star },
  { value: 'calendar', label: 'Calendar', Icon: Calendar },
  { value: 'clock', label: 'Clock', Icon: Clock },
  { value: 'users', label: 'Users', Icon: Users },
]

const DAYS_OF_WEEK = [
  { value: 'SUNDAY', label: 'Sunday' },
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
]

const RECURRENCE_TYPES = [
  { value: 'NONE', label: 'One-time Event' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
]

function getColorClasses(color: string) {
  return COLORS.find(c => c.value === color) || COLORS[0]
}

function getIconComponent(icon: string) {
  const iconData = ICONS.find(i => i.value === icon)
  return iconData?.Icon || Sun
}

function formatRecurrence(schedule: ServiceSchedule): string {
  switch (schedule.recurrenceType) {
    case 'DAILY':
      return 'Every day'
    case 'WEEKLY':
      return `Every ${schedule.dayOfWeek?.charAt(0)}${schedule.dayOfWeek?.slice(1).toLowerCase()}`
    case 'MONTHLY':
      return `Monthly on day ${schedule.dayOfMonth}`
    case 'NONE':
      if (schedule.specificDate) {
        return new Date(schedule.specificDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      }
      return 'One-time'
    default:
      return ''
  }
}

export default function ScheduleManagement() {
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSchedule, setEditingSchedule] = useState<ServiceSchedule | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reordering, setReordering] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    time: '',
    isActive: true,
    order: 0,
    recurrenceType: 'WEEKLY' as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
    dayOfWeek: 'SUNDAY' as ServiceSchedule['dayOfWeek'],
    dayOfMonth: 1,
    specificDate: '',
    color: 'blue',
    icon: 'sun',
  })

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/admin/service-schedules')
      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...formData,
        ...(editingSchedule ? { id: editingSchedule.id } : {}),
        dayOfWeek: formData.recurrenceType === 'WEEKLY' ? formData.dayOfWeek : undefined,
        dayOfMonth: formData.recurrenceType === 'MONTHLY' ? formData.dayOfMonth : undefined,
        specificDate: formData.recurrenceType === 'NONE' && formData.specificDate
          ? new Date(formData.specificDate).toISOString()
          : undefined,
      }

      const method = editingSchedule ? 'PUT' : 'POST'
      const response = await fetch('/api/admin/service-schedules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        await fetchSchedules()
        closeForm()
      }
    } catch (error) {
      console.error('Failed to save schedule:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (schedule: ServiceSchedule) => {
    setEditingSchedule(schedule)
    setFormData({
      name: schedule.name,
      description: schedule.description || '',
      time: schedule.time,
      isActive: schedule.isActive,
      order: schedule.order,
      recurrenceType: schedule.recurrenceType,
      dayOfWeek: schedule.dayOfWeek || 'SUNDAY',
      dayOfMonth: schedule.dayOfMonth || 1,
      specificDate: schedule.specificDate
        ? new Date(schedule.specificDate).toISOString().split('T')[0]
        : '',
      color: schedule.color,
      icon: schedule.icon,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return

    try {
      const response = await fetch(`/api/admin/service-schedules?id=${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchSchedules()
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error)
    }
  }

  const handleToggleActive = async (schedule: ServiceSchedule) => {
    try {
      const response = await fetch('/api/admin/service-schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: schedule.id,
          isActive: !schedule.isActive,
        }),
      })
      if (response.ok) {
        await fetchSchedules()
      }
    } catch (error) {
      console.error('Failed to toggle schedule:', error)
    }
  }

  const handleReorder = async (schedule: ServiceSchedule, direction: 'up' | 'down') => {
    const sortedSchedules = [...schedules].sort((a, b) => a.order - b.order)
    const currentIndex = sortedSchedules.findIndex(s => s.id === schedule.id)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= sortedSchedules.length) return

    setReordering(schedule.id)

    const targetSchedule = sortedSchedules[targetIndex]
    const tempOrder = schedule.order

    try {
      await Promise.all([
        fetch('/api/admin/service-schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: schedule.id, order: targetSchedule.order }),
        }),
        fetch('/api/admin/service-schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: targetSchedule.id, order: tempOrder }),
        }),
      ])
      await fetchSchedules()
    } catch (error) {
      console.error('Failed to reorder schedules:', error)
    } finally {
      setReordering(null)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingSchedule(null)
    setFormData({
      name: '',
      description: '',
      time: '',
      isActive: true,
      order: schedules.length,
      recurrenceType: 'WEEKLY',
      dayOfWeek: 'SUNDAY',
      dayOfMonth: 1,
      specificDate: '',
      color: 'blue',
      icon: 'sun',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
          <p className="text-slate-600">Loading schedules...</p>
        </div>
      </div>
    )
  }

  const sortedSchedules = [...schedules].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mt-1">
            Manage service schedules displayed on the member dashboard
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Eye size={18} />
            <span>Preview</span>
          </button>
          <button
            onClick={() => {
              setEditingSchedule(null)
              setFormData({
                name: '',
                description: '',
                time: '',
                isActive: true,
                order: schedules.length,
                recurrenceType: 'WEEKLY',
                dayOfWeek: 'SUNDAY',
                dayOfMonth: 1,
                specificDate: '',
                color: 'blue',
                icon: 'sun',
              })
              setShowForm(true)
            }}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/25"
          >
            <Plus size={18} />
            <span>Add Schedule</span>
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sunday Service"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Brief description of the service"
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 10:00 AM"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>

              {/* Recurrence Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Recurrence
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  value={formData.recurrenceType}
                  onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value as typeof formData.recurrenceType })}
                >
                  {RECURRENCE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Conditional Fields */}
              {formData.recurrenceType === 'WEEKLY' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Day of Week
                  </label>
                  <select
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value as typeof formData.dayOfWeek })}
                  >
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.recurrenceType === 'MONTHLY' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Day of Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}

              {formData.recurrenceType === 'NONE' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Specific Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    value={formData.specificDate}
                    onChange={(e) => setFormData({ ...formData, specificDate: e.target.value })}
                  />
                </div>
              )}

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-10 h-10 rounded-xl ${color.bg} ${color.border} border-2 flex items-center justify-center transition-all ${
                        formData.color === color.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                      }`}
                    >
                      {formData.color === color.value && (
                        <div className={`w-3 h-3 rounded-full ${color.text.replace('text-', 'bg-')}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(({ value, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: value })}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
                        formData.icon === value
                          ? 'bg-blue-100 border-blue-300 text-blue-600 ring-2 ring-offset-2 ring-blue-500'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Icon size={20} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Active (visible on dashboard)</span>
                </label>
              </div>

              {/* Form Actions */}
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
                    <span>{editingSchedule ? 'Update Schedule' : 'Create Schedule'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Dashboard Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Service Times</h4>
              <div className="space-y-3">
                {sortedSchedules.filter(s => s.isActive).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No active schedules</p>
                ) : (
                  sortedSchedules.filter(s => s.isActive).map(schedule => {
                    const colorClasses = getColorClasses(schedule.color)
                    const IconComponent = getIconComponent(schedule.icon)
                    return (
                      <div
                        key={schedule.id}
                        className={`flex items-center space-x-3 p-3 rounded-xl ${colorClasses.bg} ${colorClasses.border} border`}
                      >
                        <div className={`w-10 h-10 rounded-lg ${colorClasses.bg} flex items-center justify-center`}>
                          <IconComponent size={20} className={colorClasses.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${colorClasses.text}`}>{schedule.name}</p>
                          <p className="text-sm text-slate-500">
                            {formatRecurrence(schedule)} • {schedule.time}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No schedules yet</h3>
          <p className="text-slate-500 mb-6">Add your first service schedule to display on the member dashboard</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            <span>Add Schedule</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">All Schedules</h3>
            <span className="text-sm text-slate-500">{schedules.length} schedule{schedules.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {sortedSchedules.map((schedule, index) => {
              const colorClasses = getColorClasses(schedule.color)
              const IconComponent = getIconComponent(schedule.icon)
              return (
                <div
                  key={schedule.id}
                  className="p-4 flex items-center space-x-4 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Reorder Buttons */}
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => handleReorder(schedule, 'up')}
                      disabled={index === 0 || reordering !== null}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => handleReorder(schedule, 'down')}
                      disabled={index === sortedSchedules.length - 1 || reordering !== null}
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl ${colorClasses.bg} flex items-center justify-center`}>
                    <IconComponent size={24} className={colorClasses.text} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-slate-900">{schedule.name}</p>
                      {reordering === schedule.id && (
                        <Loader2 size={14} className="animate-spin text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {formatRecurrence(schedule)} • {schedule.time}
                    </p>
                    {schedule.description && (
                      <p className="text-sm text-slate-400 truncate">{schedule.description}</p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <button
                    onClick={() => handleToggleActive(schedule)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      schedule.isActive
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {schedule.isActive ? 'Active' : 'Inactive'}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
