'use client'

import { useEffect, useState } from 'react'
import { Heart, HandHeart, Cross, Check, X, Loader2 } from 'lucide-react'

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

export default function SettingsTab() {
  const [settings, setSettings] = useState<CTASettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
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
    fetchSettings()
  }, [])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!settings) {
    return null
  }

  return (
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
  )
}
