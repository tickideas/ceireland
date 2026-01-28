'use client'

import { useState, useEffect } from 'react'
import { Heart, HandHeart, Cross, Check, X, Loader2, Mail, Phone, ChevronDown, ChevronUp, Archive, Trash2, Eye, EyeOff } from 'lucide-react'

interface CTASettings {
  id: string
  givingEnabled: boolean
  givingButtonLabel: string
  givingUrl: string | null
  offlineGivingTitle: string
  offlineGivingDetails: string | null
  givingColorFrom: string
  givingColorTo: string
  prayerEnabled: boolean
  prayerButtonLabel: string
  prayerFormTitle: string
  prayerFormDescription: string | null
  prayerColorFrom: string
  prayerColorTo: string
  salvationEnabled: boolean
  salvationButtonLabel: string
  salvationTitle: string
  salvationPrayer: string | null
  salvationConfirmText: string
  salvationColorFrom: string
  salvationColorTo: string
}

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

interface SalvationResponse {
  id: string
  name: string
  email: string
  phone: string | null
  followedUp: boolean
  followUpNotes: string | null
  createdAt: string
}

type ActiveTab = 'settings' | 'prayers' | 'salvation'

export default function CTAManagement() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('settings')
  const [settings, setSettings] = useState<CTASettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Prayer requests state
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([])
  const [prayerLoading, setPrayerLoading] = useState(false)
  const [showArchivedPrayers, setShowArchivedPrayers] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null)

  // Salvation responses state
  const [salvationResponses, setSalvationResponses] = useState<SalvationResponse[]>([])
  const [salvationLoading, setSalvationLoading] = useState(false)
  const [showFollowedUp, setShowFollowedUp] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [expandedSalvation, setExpandedSalvation] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (activeTab === 'prayers') {
      fetchPrayerRequests()
    } else if (activeTab === 'salvation') {
      fetchSalvationResponses()
    }
  }, [activeTab, showArchivedPrayers, showFollowedUp])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/cta-settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      } else if (res.status === 401 || res.status === 403) {
        setMessage({ type: 'error', text: 'Session expired. Please refresh the page and log in again.' })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPrayerRequests = async () => {
    setPrayerLoading(true)
    try {
      const res = await fetch(`/api/admin/prayer-requests?includeArchived=${showArchivedPrayers}`)
      if (res.ok) {
        const data = await res.json()
        setPrayerRequests(data.requests)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching prayer requests:', error)
    } finally {
      setPrayerLoading(false)
    }
  }

  const fetchSalvationResponses = async () => {
    setSalvationLoading(true)
    try {
      const res = await fetch(`/api/admin/salvation-responses?showFollowedUp=${showFollowedUp}`)
      if (res.ok) {
        const data = await res.json()
        setSalvationResponses(data.responses)
        setPendingCount(data.pendingCount)
      }
    } catch (error) {
      console.error('Error fetching salvation responses:', error)
    } finally {
      setSalvationLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/cta-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Heart size={18} />
              <span>Button Settings</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('prayers')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'prayers'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <HandHeart size={18} />
              <span>Prayer Requests</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('salvation')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'salvation'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Cross size={18} />
              <span>Salvation</span>
              {pendingCount > 0 && (
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="p-6">
          {/* Settings Tab */}
          {activeTab === 'settings' && settings && (
            <div className="space-y-8">
              {message && (
                <div
                  className={`p-4 rounded-lg flex items-center gap-2 ${
                    message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
                  {message.text}
                </div>
              )}

              {/* Online Giving Section */}
              <div className="border border-slate-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Heart className="text-pink-500" size={20} />
                    Online Giving
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.givingEnabled}
                      onChange={(e) => setSettings({ ...settings, givingEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-600">Enabled</span>
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Button Label</label>
                    <input
                      type="text"
                      value={settings.givingButtonLabel}
                      onChange={(e) => setSettings({ ...settings, givingButtonLabel: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Online Giving URL <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="url"
                      value={settings.givingUrl || ''}
                      onChange={(e) => setSettings({ ...settings, givingUrl: e.target.value || null })}
                      placeholder="https://example.com/give"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      If provided, clicking the button will redirect to this URL. Otherwise, offline giving details will be shown.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Offline Giving Title</label>
                    <input
                      type="text"
                      value={settings.offlineGivingTitle}
                      onChange={(e) => setSettings({ ...settings, offlineGivingTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Offline Giving Details
                    </label>
                    <textarea
                      value={settings.offlineGivingDetails || ''}
                      onChange={(e) => setSettings({ ...settings, offlineGivingDetails: e.target.value || null })}
                      placeholder="Bank account details, payment instructions, etc."
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-sm font-medium text-slate-700 mb-3">Button Colors</label>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">From:</label>
                        <input
                          type="color"
                          value={settings.givingColorFrom}
                          onChange={(e) => setSettings({ ...settings, givingColorFrom: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-slate-300"
                        />
                        <input
                          type="text"
                          value={settings.givingColorFrom}
                          onChange={(e) => setSettings({ ...settings, givingColorFrom: e.target.value })}
                          className="w-24 px-2 py-1 text-sm border border-slate-300 rounded"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">To:</label>
                        <input
                          type="color"
                          value={settings.givingColorTo}
                          onChange={(e) => setSettings({ ...settings, givingColorTo: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-slate-300"
                        />
                        <input
                          type="text"
                          value={settings.givingColorTo}
                          onChange={(e) => setSettings({ ...settings, givingColorTo: e.target.value })}
                          className="w-24 px-2 py-1 text-sm border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                    <div
                      className="mt-3 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-md"
                      style={{ background: `linear-gradient(to right, ${settings.givingColorFrom}, ${settings.givingColorTo})` }}
                    >
                      Preview: {settings.givingButtonLabel}
                    </div>
                  </div>
                </div>
              </div>

              {/* Prayer Request Section */}
              <div className="border border-slate-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <HandHeart className="text-blue-500" size={20} />
                    Prayer Request
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.prayerEnabled}
                      onChange={(e) => setSettings({ ...settings, prayerEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-600">Enabled</span>
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Button Label</label>
                    <input
                      type="text"
                      value={settings.prayerButtonLabel}
                      onChange={(e) => setSettings({ ...settings, prayerButtonLabel: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Form Title</label>
                    <input
                      type="text"
                      value={settings.prayerFormTitle}
                      onChange={(e) => setSettings({ ...settings, prayerFormTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Form Description <span className="text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      value={settings.prayerFormDescription || ''}
                      onChange={(e) => setSettings({ ...settings, prayerFormDescription: e.target.value || null })}
                      placeholder="Share your prayer request with us..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-sm font-medium text-slate-700 mb-3">Button Colors</label>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">From:</label>
                        <input
                          type="color"
                          value={settings.prayerColorFrom}
                          onChange={(e) => setSettings({ ...settings, prayerColorFrom: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-slate-300"
                        />
                        <input
                          type="text"
                          value={settings.prayerColorFrom}
                          onChange={(e) => setSettings({ ...settings, prayerColorFrom: e.target.value })}
                          className="w-24 px-2 py-1 text-sm border border-slate-300 rounded"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">To:</label>
                        <input
                          type="color"
                          value={settings.prayerColorTo}
                          onChange={(e) => setSettings({ ...settings, prayerColorTo: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-slate-300"
                        />
                        <input
                          type="text"
                          value={settings.prayerColorTo}
                          onChange={(e) => setSettings({ ...settings, prayerColorTo: e.target.value })}
                          className="w-24 px-2 py-1 text-sm border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                    <div
                      className="mt-3 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-md"
                      style={{ background: `linear-gradient(to right, ${settings.prayerColorFrom}, ${settings.prayerColorTo})` }}
                    >
                      Preview: {settings.prayerButtonLabel}
                    </div>
                  </div>
                </div>
              </div>

              {/* Salvation Section */}
              <div className="border border-slate-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Cross className="text-amber-500" size={20} />
                    Salvation / Accept Christ
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.salvationEnabled}
                      onChange={(e) => setSettings({ ...settings, salvationEnabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-600">Enabled</span>
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Button Label</label>
                    <input
                      type="text"
                      value={settings.salvationButtonLabel}
                      onChange={(e) => setSettings({ ...settings, salvationButtonLabel: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Popup Title</label>
                    <input
                      type="text"
                      value={settings.salvationTitle}
                      onChange={(e) => setSettings({ ...settings, salvationTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Prayer of Salvation
                    </label>
                    <textarea
                      value={settings.salvationPrayer || ''}
                      onChange={(e) => setSettings({ ...settings, salvationPrayer: e.target.value || null })}
                      placeholder="Enter the prayer of salvation text that will be shown to users..."
                      rows={6}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirmation Button Text</label>
                    <input
                      type="text"
                      value={settings.salvationConfirmText}
                      onChange={(e) => setSettings({ ...settings, salvationConfirmText: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-sm font-medium text-slate-700 mb-3">Button Colors</label>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">From:</label>
                        <input
                          type="color"
                          value={settings.salvationColorFrom}
                          onChange={(e) => setSettings({ ...settings, salvationColorFrom: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-slate-300"
                        />
                        <input
                          type="text"
                          value={settings.salvationColorFrom}
                          onChange={(e) => setSettings({ ...settings, salvationColorFrom: e.target.value })}
                          className="w-24 px-2 py-1 text-sm border border-slate-300 rounded"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">To:</label>
                        <input
                          type="color"
                          value={settings.salvationColorTo}
                          onChange={(e) => setSettings({ ...settings, salvationColorTo: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-slate-300"
                        />
                        <input
                          type="text"
                          value={settings.salvationColorTo}
                          onChange={(e) => setSettings({ ...settings, salvationColorTo: e.target.value })}
                          className="w-24 px-2 py-1 text-sm border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                    <div
                      className="mt-3 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-md"
                      style={{ background: `linear-gradient(to right, ${settings.salvationColorFrom}, ${settings.salvationColorTo})` }}
                    >
                      Preview: {settings.salvationButtonLabel}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* Prayer Requests Tab */}
          {activeTab === 'prayers' && (
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
                    checked={showArchivedPrayers}
                    onChange={(e) => setShowArchivedPrayers(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-slate-600">Show archived</span>
                </label>
              </div>

              {prayerLoading ? (
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
                          setExpandedPrayer(expandedPrayer === prayer.id ? null : prayer.id)
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
                            {expandedPrayer === prayer.id ? (
                              <ChevronUp size={20} className="text-slate-400" />
                            ) : (
                              <ChevronDown size={20} className="text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedPrayer === prayer.id && (
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
          )}

          {/* Salvation Responses Tab */}
          {activeTab === 'salvation' && (
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

              {salvationLoading ? (
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
                        onClick={() => setExpandedSalvation(expandedSalvation === response.id ? null : response.id)}
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
                            {expandedSalvation === response.id ? (
                              <ChevronUp size={20} className="text-slate-400" />
                            ) : (
                              <ChevronDown size={20} className="text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedSalvation === response.id && (
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
          )}
        </div>
      </div>
    </div>
  )
}
