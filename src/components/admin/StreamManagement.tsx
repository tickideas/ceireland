'use client'

import { useState, useEffect } from 'react'
import { Radio, Image, Check, X, ExternalLink, Loader2, AlertCircle, Clock } from 'lucide-react'

interface StreamSettings {
  streamUrl: string
  posterUrl: string
  isActive: boolean
  scheduledEndTime: string | null
}

export default function StreamManagement() {
  const [settings, setSettings] = useState<StreamSettings>({
    streamUrl: '',
    posterUrl: '',
    isActive: false,
    scheduledEndTime: null
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toggling, setToggling] = useState(false)

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
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
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
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to toggle stream status:', error)
    } finally {
      setToggling(false)
    }
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
                {settings.isActive ? 'Currently broadcasting' : 'Stream is offline'}
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
              {toggling ? 'Updating...' : settings.isActive ? 'Go Offline' : 'Go Live'}
            </button>
          </div>
        </div>
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5" />
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Stream Configuration</h3>
          <p className="text-sm text-slate-500 mt-1">Configure your HLS stream URL and display settings</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Stream URL */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Stream URL
            </label>
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
            <p className="text-xs text-slate-500 flex items-center space-x-1">
              <AlertCircle size={12} />
              <span>Enter the HLS stream URL (.m3u8) for the live service</span>
            </p>
          </div>

          {/* Poster URL */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Poster Image URL
            </label>
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
            <p className="text-xs text-slate-500">
              Displayed when the stream is inactive or before playback starts
            </p>
            {settings.posterUrl && (
              <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
                <img 
                  src={settings.posterUrl} 
                  alt="Poster preview" 
                  className="w-full h-48 object-cover"
                />
              </div>
            )}
          </div>

          {/* Scheduled End Time */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Scheduled End Time <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors pr-10"
                value={settings.scheduledEndTime ? new Date(settings.scheduledEndTime).toISOString().slice(0, 16) : ''}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  scheduledEndTime: e.target.value ? new Date(e.target.value).toISOString() : null 
                })}
              />
              <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500">
              Stream will automatically go offline at this time. Leave empty for manual control.
            </p>
            {settings.scheduledEndTime && (
              <button
                type="button"
                onClick={() => setSettings({ ...settings, scheduledEndTime: null })}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Clear end time
              </button>
            )}
          </div>

          {/* Stream Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                settings.isActive ? 'bg-emerald-100' : 'bg-slate-200'
              }`}>
                {settings.isActive ? (
                  <Check className="w-5 h-5 text-emerald-600" />
                ) : (
                  <X className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-slate-900">Stream Status</p>
                <p className="text-sm text-slate-500">
                  {settings.isActive ? 'Stream is visible to users' : 'Stream is hidden from users'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, isActive: !settings.isActive })}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                settings.isActive ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  settings.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {saved && (
              <div className="flex items-center space-x-2 text-emerald-600">
                <Check size={18} />
                <span className="text-sm font-medium">Settings saved successfully</span>
              </div>
            )}
            {!saved && <div />}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/25"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Current Settings Display */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Current Configuration</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-1">Stream URL</p>
              <p className="font-medium text-slate-900 truncate">
                {settings.streamUrl || <span className="text-slate-400">Not configured</span>}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-1">Poster</p>
              {settings.posterUrl ? (
                <a 
                  href={settings.posterUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <span>View Image</span>
                  <ExternalLink size={14} />
                </a>
              ) : (
                <span className="text-slate-400">Not configured</span>
              )}
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-1">Status</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                settings.isActive
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {settings.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-1">Scheduled End</p>
              <p className="font-medium text-slate-900">
                {settings.scheduledEndTime ? (
                  new Date(settings.scheduledEndTime).toLocaleString()
                ) : (
                  <span className="text-slate-400">Not set</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
