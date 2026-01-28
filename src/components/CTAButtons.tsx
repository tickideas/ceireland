'use client'

import { useState, useEffect } from 'react'
import { Heart, HandHeart, Cross, X, Loader2, Check } from 'lucide-react'

interface CTASettings {
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

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title: string
}

function Modal({ isOpen, onClose, children, title }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export default function CTAButtons() {
  const [settings, setSettings] = useState<CTASettings | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [givingModalOpen, setGivingModalOpen] = useState(false)
  const [prayerModalOpen, setPrayerModalOpen] = useState(false)
  const [salvationModalOpen, setSalvationModalOpen] = useState(false)
  const [salvationFormOpen, setSalvationFormOpen] = useState(false)
  
  // Form states
  const [prayerForm, setPrayerForm] = useState({ name: '', email: '', request: '', website: '', formLoadedAt: 0 })
  const [salvationForm, setSalvationForm] = useState({ name: '', email: '', website: '', formLoadedAt: 0 })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<'prayer' | 'salvation' | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/cta-settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching CTA settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGivingClick = () => {
    if (settings?.givingUrl) {
      window.open(settings.givingUrl, '_blank', 'noopener,noreferrer')
    } else {
      setGivingModalOpen(true)
    }
  }

  const handlePrayerModalOpen = () => {
    setPrayerForm({ name: '', email: '', request: '', website: '', formLoadedAt: Date.now() })
    setPrayerModalOpen(true)
  }

  const handleSalvationModalOpen = () => {
    setSalvationModalOpen(true)
  }

  const handleSalvationFormOpen = () => {
    setSalvationForm({ name: '', email: '', website: '', formLoadedAt: Date.now() })
    setSalvationFormOpen(true)
  }

  const handlePrayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prayerForm.name || !prayerForm.request) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/prayer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prayerForm)
      })

      if (res.ok) {
        setSubmitSuccess('prayer')
        setPrayerForm({ name: '', email: '', request: '', website: '', formLoadedAt: 0 })
        setTimeout(() => {
          setPrayerModalOpen(false)
          setSubmitSuccess(null)
        }, 2000)
      } else {
        const data = await res.json()
        setSubmitError(data.error || 'Failed to submit prayer request')
      }
    } catch {
      setSubmitError('Failed to submit prayer request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSalvationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!salvationForm.name || !salvationForm.email) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/salvation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salvationForm)
      })

      if (res.ok) {
        setSubmitSuccess('salvation')
        setSalvationForm({ name: '', email: '', website: '', formLoadedAt: 0 })
        setTimeout(() => {
          setSalvationModalOpen(false)
          setSalvationFormOpen(false)
          setSubmitSuccess(null)
        }, 3000)
      } else {
        const data = await res.json()
        setSubmitError(data.error || 'Failed to submit')
      }
    } catch {
      setSubmitError('Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !settings) return null

  // Only show buttons that are both enabled AND have content configured
  const showGiving = settings.givingEnabled && (settings.givingUrl?.trim() || settings.offlineGivingDetails?.trim())
  const showPrayer = settings.prayerEnabled
  const showSalvation = settings.salvationEnabled && settings.salvationPrayer?.trim()

  const hasAnyButton = showGiving || showPrayer || showSalvation

  if (!hasAnyButton) return null

  return (
    <>
      <div className="flex justify-center mt-4 px-2 lg:px-0">
        <div className="flex flex-wrap justify-center gap-3 w-full lg:w-[85%]">
          {showGiving && (
            <button
              onClick={handleGivingClick}
              className="flex-1 min-w-[140px] max-w-[280px] flex items-center justify-center gap-2 px-5 py-3 text-white rounded-full font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
              style={{ background: `linear-gradient(to right, ${settings.givingColorFrom}, ${settings.givingColorTo})` }}
            >
              <Heart size={18} />
              {settings.givingButtonLabel}
            </button>
          )}

          {showPrayer && (
            <button
              onClick={handlePrayerModalOpen}
              className="flex-1 min-w-[140px] max-w-[280px] flex items-center justify-center gap-2 px-5 py-3 text-white rounded-full font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
              style={{ background: `linear-gradient(to right, ${settings.prayerColorFrom}, ${settings.prayerColorTo})` }}
            >
              <HandHeart size={18} />
              {settings.prayerButtonLabel}
            </button>
          )}

          {showSalvation && (
            <button
              onClick={handleSalvationModalOpen}
              className="flex-1 min-w-[140px] max-w-[280px] flex items-center justify-center gap-2 px-5 py-3 text-white rounded-full font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
              style={{ background: `linear-gradient(to right, ${settings.salvationColorFrom}, ${settings.salvationColorTo})` }}
            >
              <Cross size={18} />
              {settings.salvationButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* Offline Giving Modal */}
      <Modal
        isOpen={givingModalOpen}
        onClose={() => setGivingModalOpen(false)}
        title={settings.offlineGivingTitle}
      >
        <div className="space-y-4">
          {settings.offlineGivingDetails ? (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{settings.offlineGivingDetails}</p>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Giving details have not been configured yet.
            </p>
          )}
        </div>
      </Modal>

      {/* Prayer Request Modal */}
      <Modal
        isOpen={prayerModalOpen}
        onClose={() => {
          setPrayerModalOpen(false)
          setSubmitError(null)
        }}
        title={settings.prayerFormTitle}
      >
        {submitSuccess === 'prayer' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Thank You!</h3>
            <p className="text-gray-600">Your prayer request has been submitted.</p>
          </div>
        ) : (
          <form onSubmit={handlePrayerSubmit} className="space-y-4">
            {settings.prayerFormDescription && (
              <p className="text-gray-600 text-sm">{settings.prayerFormDescription}</p>
            )}

            {submitError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{submitError}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={prayerForm.name}
                onChange={(e) => setPrayerForm({ ...prayerForm, name: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="email"
                value={prayerForm.email}
                onChange={(e) => setPrayerForm({ ...prayerForm, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Prayer Request <span className="text-red-500">*</span>
              </label>
              <textarea
                value={prayerForm.request}
                onChange={(e) => setPrayerForm({ ...prayerForm, request: e.target.value })}
                required
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Share your prayer request..."
              />
            </div>

            {/* Honeypot field - hidden from users, bots will fill it */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="prayer-website">Website</label>
              <input
                type="text"
                id="prayer-website"
                name="website"
                value={prayerForm.website}
                onChange={(e) => setPrayerForm({ ...prayerForm, website: e.target.value })}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Prayer Request'
              )}
            </button>
          </form>
        )}
      </Modal>

      {/* Salvation Modal */}
      <Modal
        isOpen={salvationModalOpen}
        onClose={() => {
          setSalvationModalOpen(false)
          setSalvationFormOpen(false)
          setSubmitError(null)
        }}
        title={settings.salvationTitle}
      >
        {submitSuccess === 'salvation' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cross className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to the Family of God!</h3>
            <p className="text-gray-600">
              Congratulations on making the best decision of your life. We will reach out to you soon!
            </p>
          </div>
        ) : !salvationFormOpen ? (
          <div className="space-y-6">
            {settings.salvationPrayer ? (
              <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed italic">
                  {settings.salvationPrayer}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                The prayer of salvation has not been configured yet.
              </p>
            )}

            {settings.salvationPrayer && (
              <button
                onClick={handleSalvationFormOpen}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 font-medium transition-all shadow-lg"
              >
                <Check size={18} />
                {settings.salvationConfirmText}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSalvationSubmit} className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Cross className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-gray-600 text-sm">
                Please provide your details so we can follow up with you.
              </p>
            </div>

            {submitError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{submitError}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={salvationForm.name}
                onChange={(e) => setSalvationForm({ ...salvationForm, name: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={salvationForm.email}
                onChange={(e) => setSalvationForm({ ...salvationForm, email: e.target.value })}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="your@email.com"
              />
            </div>

            {/* Honeypot field - hidden from users, bots will fill it */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="salvation-website">Website</label>
              <input
                type="text"
                id="salvation-website"
                name="website"
                value={salvationForm.website}
                onChange={(e) => setSalvationForm({ ...salvationForm, website: e.target.value })}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 font-medium transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>

            <button
              type="button"
              onClick={() => setSalvationFormOpen(false)}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-900 text-sm"
            >
              Go back
            </button>
          </form>
        )}
      </Modal>
    </>
  )
}
