'use client'

import { useState, useEffect } from 'react'
import {
  Mail,
  Key,
  Globe,
  User,
  Check,
  X,
  Loader2,
  AlertCircle,
  Send,
  Eye,
  EyeOff,
  Shield,
  Info
} from 'lucide-react'

interface EmailSettings {
  id: string
  emailVerificationEnabled: boolean
  providerApiKey: string | null
  providerBaseUrl: string | null
  fromEmail: string | null
  fromName: string | null
  hasApiKey: boolean
  isConfigured: boolean
  envFallbacks?: {
    apiKey: boolean
    baseUrl: boolean
    fromEmail: boolean
  }
}

export default function EmailSettingsManagement() {
  const [settings, setSettings] = useState<EmailSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  // Test email state
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/email-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setEmailVerificationEnabled(data.emailVerificationEnabled)
        setApiKey(data.providerApiKey || '')
        setBaseUrl(data.providerBaseUrl || '')
        setFromEmail(data.fromEmail || '')
        setFromName(data.fromName || '')
      } else {
        setError('Failed to load email settings')
      }
    } catch (err) {
      console.error('Failed to fetch email settings:', err)
      setError('Failed to load email settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const response = await fetch('/api/admin/email-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailVerificationEnabled,
          providerApiKey: apiKey || null,
          providerBaseUrl: baseUrl || null,
          fromEmail: fromEmail || null,
          fromName: fromName || null,
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setApiKey(data.providerApiKey || '')
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save settings')
      }
    } catch (err) {
      console.error('Failed to save email settings:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTestEmail = async () => {
    if (!testEmail) return

    setSendingTest(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/admin/email-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: testEmail })
      })

      const data = await response.json()

      if (response.ok) {
        setTestResult({ success: true, message: data.message })
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to send test email' })
      }
    } catch (err) {
      console.error('Failed to send test email:', err)
      setTestResult({ success: false, message: 'Failed to send test email' })
    } finally {
      setSendingTest(false)
    }
  }

  const toggleVerification = async () => {
    const newValue = !emailVerificationEnabled
    setEmailVerificationEnabled(newValue)

    try {
      const response = await fetch('/api/admin/email-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailVerificationEnabled: newValue })
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        // Revert on failure
        setEmailVerificationEnabled(!newValue)
      }
    } catch (err) {
      console.error('Failed to toggle verification:', err)
      setEmailVerificationEnabled(!newValue)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
          <p className="text-slate-600">Loading email settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`relative overflow-hidden rounded-2xl p-6 ${
        settings?.isConfigured
          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
          : 'bg-gradient-to-br from-amber-500 to-amber-600'
      }`}>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              settings?.isConfigured ? 'bg-white/20' : 'bg-white/20'
            }`}>
              <Mail className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Email Configuration</h2>
              <p className="text-white/80">
                {settings?.isConfigured ? 'Email service is configured' : 'Email service needs configuration'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {settings?.isConfigured && (
              <span className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full">
                <Check className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">Ready</span>
              </span>
            )}
          </div>
        </div>
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5" />
      </div>

      {/* Email Verification Toggle */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Email Verification</h3>
          <p className="text-sm text-slate-500 mt-1">Control whether new users must verify their email</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                emailVerificationEnabled ? 'bg-emerald-100' : 'bg-slate-200'
              }`}>
                {emailVerificationEnabled ? (
                  <Shield className="w-5 h-5 text-emerald-600" />
                ) : (
                  <X className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-slate-900">Require Email Verification</p>
                <p className="text-sm text-slate-500">
                  {emailVerificationEnabled
                    ? 'Users must verify email before logging in'
                    : 'Users can log in immediately after registration'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleVerification}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                emailVerificationEnabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  emailVerificationEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {!emailVerificationEnabled && (
            <div className="mt-4 flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Security Notice</p>
                <p className="text-sm text-amber-700">
                  Disabling email verification allows anyone to create accounts without proving email ownership.
                  Only disable this if you have another verification method in place.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Provider Settings Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Email Provider Settings</h3>
          <p className="text-sm text-slate-500 mt-1">Configure your UseSend email provider credentials</p>
        </div>

        {error && (
          <div className="mx-6 mt-6 flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Environment Fallback Notice */}
          {settings?.envFallbacks && (settings.envFallbacks.apiKey || settings.envFallbacks.fromEmail) && (
            <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Using Environment Variables</p>
                <p className="text-sm text-blue-700">
                  Some settings are using environment variable fallbacks.
                  {settings.envFallbacks.apiKey && ' API Key from USESEND_API_KEY.'}
                  {settings.envFallbacks.fromEmail && ' From Email from USESEND_FROM_EMAIL.'}
                </p>
              </div>
            </div>
          )}

          {/* API Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder="Enter your UseSend API key"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors pr-20"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <Key className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <p className="text-xs text-slate-500 flex items-center space-x-1">
              <AlertCircle size={12} />
              <span>Your API key is stored securely and masked in the UI</span>
            </p>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Base URL (Optional)
            </label>
            <div className="relative">
              <input
                type="url"
                placeholder="https://api.usesend.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors pr-10"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500">
              Leave empty to use the default UseSend API endpoint
            </p>
          </div>

          {/* From Email */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              From Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="noreply@yourchurch.org"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors pr-10"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
              />
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500">
              The email address that will appear as the sender
            </p>
          </div>

          {/* From Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              From Name
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Christ Embassy Ireland"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors pr-10"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
              <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500">
              The name that will appear as the sender
            </p>
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

      {/* Test Email Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Test Email Configuration</h3>
          <p className="text-sm text-slate-500 mt-1">Send a test email to verify your settings are working</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="email"
                placeholder="Enter recipient email address"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={sendingTest || !testEmail || !settings?.isConfigured}
              className="inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              {sendingTest ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Send Test Email</span>
                </>
              )}
            </button>
          </div>

          {!settings?.isConfigured && (
            <p className="text-sm text-amber-600 flex items-center space-x-1">
              <AlertCircle size={14} />
              <span>Configure email settings above before sending a test email</span>
            </p>
          )}

          {testResult && (
            <div className={`flex items-center space-x-2 p-4 rounded-xl ${
              testResult.success
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {testResult.success ? (
                <Check className="w-5 h-5 text-emerald-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-sm ${testResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                {testResult.message}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Current Configuration Display */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">Current Configuration</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-1">Email Verification</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                emailVerificationEnabled
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {emailVerificationEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-1">API Key</p>
              <p className="font-medium text-slate-900">
                {settings?.hasApiKey ? (
                  <span className="text-emerald-600">Configured</span>
                ) : (
                  <span className="text-slate-400">Not configured</span>
                )}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-1">From Email</p>
              <p className="font-medium text-slate-900 truncate">
                {fromEmail || <span className="text-slate-400">Not set</span>}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-1">Status</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                settings?.isConfigured
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {settings?.isConfigured ? 'Ready' : 'Needs Setup'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
