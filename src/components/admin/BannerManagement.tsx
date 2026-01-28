'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Image, Link, GripVertical, Loader2 } from 'lucide-react'

interface Banner {
  id: string
  title: string
  imageUrl: string
  linkUrl?: string
  active: boolean
  order: number
}

export default function BannerManagement() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    active: true,
    order: 0
  })

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/admin/banners')
      if (response.ok) {
        const data = await response.json()
        setBanners(data.banners)
      }
    } catch (error) {
      console.error('Failed to fetch banners:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const url = editingBanner ? `/api/admin/banners/${editingBanner.id}` : '/api/admin/banners'
      const method = editingBanner ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchBanners()
        closeForm()
      }
    } catch (error) {
      console.error('Failed to save banner:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner)
    setFormData({
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      active: banner.active,
      order: banner.order
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return

    try {
      const response = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchBanners()
      }
    } catch (error) {
      console.error('Failed to delete banner:', error)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingBanner(null)
    setFormData({ title: '', imageUrl: '', linkUrl: '', active: true, order: 0 })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
          <p className="text-slate-600">Loading banners...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mt-1">
            Manage carousel banners displayed on the member dashboard
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBanner(null)
            setFormData({ title: '', imageUrl: '', linkUrl: '', active: true, order: banners.length })
            setShowForm(true)
          }}
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/25"
        >
          <Plus size={18} />
          <span>Add Banner</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              {editingBanner ? 'Edit Banner' : 'Add New Banner'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="Banner title"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Image URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
                {formData.imageUrl && (
                  <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
                    <img 
                      src={formData.imageUrl} 
                      alt="Preview" 
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Link URL <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center space-x-3 cursor-pointer p-2.5">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Active</span>
                  </label>
                </div>
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
                    <span>{editingBanner ? 'Update Banner' : 'Create Banner'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banners Grid */}
      {banners.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-12 text-center">
          <Image className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No banners yet</h3>
          <p className="text-slate-500 mb-6">Add your first banner to display on the member dashboard</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            <span>Add Banner</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.sort((a, b) => a.order - b.order).map((banner) => (
            <div 
              key={banner.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden group hover:shadow-lg transition-all duration-300"
            >
              {/* Image */}
              <div className="relative aspect-video bg-slate-100">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                {/* Order Badge */}
                <div className="absolute top-3 left-3 flex items-center space-x-1 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
                  <GripVertical size={14} className="text-white/70" />
                  <span className="text-xs font-medium text-white">#{banner.order}</span>
                </div>
                {/* Status Badge */}
                <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${
                  banner.active 
                    ? 'bg-emerald-500/90 text-white' 
                    : 'bg-slate-500/90 text-white'
                }`}>
                  {banner.active ? 'Active' : 'Inactive'}
                </div>
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(banner)}
                      className="p-3 bg-white rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="p-3 bg-white rounded-xl text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
              {/* Content */}
              <div className="p-4">
                <h4 className="font-semibold text-slate-900 mb-1 truncate">{banner.title}</h4>
                {banner.linkUrl ? (
                  <div className="flex items-center space-x-1 text-sm text-blue-600">
                    <Link size={14} />
                    <a 
                      href={banner.linkUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="truncate hover:underline"
                    >
                      {banner.linkUrl}
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No link configured</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View for Mobile */}
      {banners.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden lg:hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">All Banners</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {banners.sort((a, b) => a.order - b.order).map((banner) => (
              <div key={banner.id} className="p-4 flex items-center space-x-4">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-16 h-10 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{banner.title}</p>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-slate-500">Order: {banner.order}</span>
                    <span className={`px-2 py-0.5 rounded-full ${
                      banner.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {banner.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(banner)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
