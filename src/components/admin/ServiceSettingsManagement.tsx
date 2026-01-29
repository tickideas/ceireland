"use client"

import { useEffect, useState } from 'react'
import { Settings, Image, Loader2, Check } from 'lucide-react'

interface ServiceSettings {
  appName: string
  headerTitle: string
  authBackgroundUrl?: string
  authLogoUrl?: string
  authWelcomeHeading?: string
  authTagline?: string
  authFooterText?: string
}

const defaults: ServiceSettings = {
  appName: 'Church App',
  headerTitle: 'Church Service',
  authBackgroundUrl: '',
  authLogoUrl: '',
  authWelcomeHeading: 'your community',
  authTagline: 'Connect, worship, and grow together.',
  authFooterText: 'Faith · Community · Purpose'
}

export default function ServiceSettingsManagement() {
  const [settings, setSettings] = useState<ServiceSettings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/service-settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (e) {
      console.error('Failed to fetch service settings', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/service-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (e) {
      console.error('Failed to save service settings', e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
          <p className="text-slate-600">Loading service settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* App Configuration */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">App Configuration</h3>
            <p className="text-sm text-slate-500">General application settings</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Application Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">Used in browser title and throughout the app</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Header Title
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                value={settings.headerTitle}
                onChange={(e) => setSettings({ ...settings, headerTitle: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">Displayed on the member dashboard</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Welcome Heading
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              value={settings.authWelcomeHeading || ''}
              onChange={(e) => setSettings({ ...settings, authWelcomeHeading: e.target.value })}
              placeholder="your community"
            />
            <p className="text-xs text-slate-500 mt-1">Shown on login/register pages as &ldquo;Welcome to <span className="font-medium">{settings.authWelcomeHeading || 'your community'}</span>&rdquo;</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Auth Tagline
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                value={settings.authTagline || ''}
                onChange={(e) => setSettings({ ...settings, authTagline: e.target.value })}
                placeholder="Connect, worship, and grow together."
              />
              <p className="text-xs text-slate-500 mt-1">Subtitle text below the welcome heading</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Auth Footer Text
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                value={settings.authFooterText || ''}
                onChange={(e) => setSettings({ ...settings, authFooterText: e.target.value })}
                placeholder="Faith · Community · Purpose"
              />
              <p className="text-xs text-slate-500 mt-1">Decorative footer text at the bottom of the panel (use · for separators)</p>
            </div>
          </div>
        </form>
      </div>

      {/* Auth Pages Branding */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-3">
          <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
            <Image className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Auth Pages Branding</h3>
            <p className="text-sm text-slate-500">Logo and background image for login and registration pages</p>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo Image URL</label>
            <input
              type="url"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              value={settings.authLogoUrl || ''}
              onChange={(e) => setSettings({ ...settings, authLogoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-slate-500 mt-1">Replaces the default cross icon on login/register pages</p>
          </div>
          {settings.authLogoUrl && (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50">
                <img
                  src={settings.authLogoUrl}
                  alt="Logo preview"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-sm text-slate-500">Logo preview</span>
            </div>
          )}
          <div className="border-t border-slate-100 pt-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Background Image URL</label>
            <input
              type="url"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              value={settings.authBackgroundUrl || ''}
              onChange={(e) => setSettings({ ...settings, authBackgroundUrl: e.target.value })}
              placeholder="https://example.com/background.jpg"
            />
            <p className="text-xs text-slate-500 mt-1">Background for the left panel on desktop, full background on mobile</p>
          </div>
          {settings.authBackgroundUrl && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <img
                src={settings.authBackgroundUrl}
                alt="Background preview"
                className="w-full h-48 object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-200/60">
        {saved ? (
          <div className="flex items-center space-x-2 text-emerald-600">
            <Check size={18} />
            <span className="text-sm font-medium">Settings saved successfully</span>
          </div>
        ) : (
          <div />
        )}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/25"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save All Settings</span>
          )}
        </button>
      </div>
    </div>
  )
}
