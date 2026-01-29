'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, UserPlus, Check, X, Edit2, Trash2, Shield, ShieldOff, ChevronLeft, ChevronRight, Users } from 'lucide-react'

interface UserListItem {
  id: string
  title: string
  name: string
  lastName: string
  email: string
  phone: string
  approved: boolean
  role: string
  createdAt: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending'>('all')
  const [counts, setCounts] = useState<{ all: number; pending: number }>({ all: 0, pending: 0 })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editing, setEditing] = useState<Partial<UserListItem> & { id?: string; role?: string; approved?: boolean }>({})
  const [creatingAdmin, setCreatingAdmin] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingSearch, setPendingSearch] = useState('')
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchUsers()
  }, [filter, search, page, pageSize])

  useEffect(() => {
    fetchCounts()
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current)
    }
  }, [])

  const fetchUsers = async () => {
    try {
      const qs = new URLSearchParams({ status: filter, page: String(page), pageSize: String(pageSize) })
      if (search) qs.set('search', search)
      const response = await fetch(`/api/admin/users?${qs.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        if (data.pagination) {
          setTotal(data.pagination.total)
        }
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSearchChange = (value: string) => {
    setPendingSearch(value)
    if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current)
    const t = setTimeout(() => {
      setSearch(value.trim())
    }, 300)
    searchDebounceTimerRef.current = t
  }

  const fetchCounts = async () => {
    try {
      const [allRes, pendingRes] = await Promise.all([
        fetch('/api/admin/users?status=all&page=1&pageSize=1'),
        fetch('/api/admin/users?status=pending&page=1&pageSize=1')
      ])
      const allData = allRes.ok ? await allRes.json() : { pagination: { total: 0 } }
      const pendingData = pendingRes.ok ? await pendingRes.json() : { pagination: { total: 0 } }
      setCounts({ all: allData.pagination?.total || 0, pending: pendingData.pagination?.total || 0 })
    } catch (error) {
      console.error('Failed to fetch member counts:', error)
    }
  }

  const handleApprove = async (userId: string, approved: boolean) => {
    try {
      setError('')
      setMessage('')
      
      const response = await fetch('/api/admin/users/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approved })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        await fetchUsers()
        await fetchCounts()
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to update member')
      }
    } catch (error) {
      console.error('Failed to update member:', error)
      setError('Network error. Please try again.')
    }
  }

  const openEdit = (user?: UserListItem) => {
    if (user) {
      setEditing({ ...user })
      setCreatingAdmin(false)
    } else {
      setEditing({ title: '', name: '', lastName: '', email: '', phone: '', role: 'ADMIN', approved: true })
      setCreatingAdmin(true)
    }
    setShowEdit(true)
  }

  const saveEdit = async () => {
    try {
      setError('')
      setMessage('')
      if (creatingAdmin) {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editing.title,
            name: editing.name,
            lastName: editing.lastName,
            email: editing.email,
            phone: editing.phone,
            role: 'ADMIN',
            approved: true
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create admin')
        setMessage('Admin created successfully')
      } else if (editing.id) {
        const res = await fetch(`/api/admin/users/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editing.title,
            name: editing.name,
            lastName: editing.lastName,
            email: editing.email,
            phone: editing.phone,
            approved: editing.approved
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update member')
        setMessage('Member updated successfully')
      }
      setShowEdit(false)
      await fetchUsers()
      await fetchCounts()
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed')
    }
  }

  const deleteUser = async (user: UserListItem) => {
    if (!confirm(`Delete ${user.name} ${user.lastName}? This cannot be undone.`)) return
    try {
      setError('')
      setMessage('')
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to delete member')
      setMessage('Member deleted')
      await fetchUsers()
      await fetchCounts()
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed')
    }
  }

  const setRole = async (user: UserListItem, role: 'ADMIN' | 'USER') => {
    try {
      setError('')
      setMessage('')
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update role')
      setMessage('Role updated')
      await fetchUsers()
      await fetchCounts()
      setTimeout(() => setMessage(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed')
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
          <p className="text-slate-600">Loading members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => { setFilter('all'); setPage(1) }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap touch-manipulation ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => { setFilter('pending'); setPage(1) }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap touch-manipulation ${
              filter === 'pending'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Pending ({counts.pending})
          </button>
        </div>
        <button
          onClick={() => openEdit()}
          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-lg shadow-blue-500/25 touch-manipulation"
        >
          <UserPlus size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span>Add Admin</span>
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl">
          <Check size={18} />
          <span>{message}</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <X size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Search and Pagination */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, email, phone..."
            className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={pendingSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
          <span className="whitespace-nowrap">
            {total === 0 ? 0 : ((page - 1) * pageSize + 1)}-{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2 sm:gap-4">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1) }}
              className="bg-white border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 sm:p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium min-w-[3rem] text-center">{page}/{totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 sm:p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Member</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Role</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-8 sm:py-12 text-center">
                    <Users className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-2 sm:mb-3" />
                    <p className="text-slate-500 text-sm">No members found</p>
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm sm:text-base font-semibold flex-shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm sm:text-base truncate">
                          {user.title} {user.name} {user.lastName}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500 md:hidden truncate">{user.email}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                    <p className="text-sm text-slate-900">{user.email}</p>
                    <p className="text-sm text-slate-500">{user.phone}</p>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                      user.approved
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {user.approved ? 'OK' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-2 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                      {!user.approved && (
                        <>
                          <button
                            onClick={() => handleApprove(user.id, true)}
                            className="p-1.5 sm:p-2 text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 rounded-lg transition-colors touch-manipulation"
                            title="Approve"
                          >
                            <Check size={14} className="sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => handleApprove(user.id, false)}
                            className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
                            title="Reject"
                          >
                            <X size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors touch-manipulation"
                        title="Edit"
                      >
                        <Edit2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => deleteUser(user)}
                        className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
                        title="Delete"
                      >
                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      {user.role !== 'ADMIN' ? (
                        <button
                          onClick={() => setRole(user, 'ADMIN')}
                          className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors touch-manipulation hidden sm:block"
                          title="Make Admin"
                        >
                          <Shield size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setRole(user, 'USER')}
                          className="p-1.5 sm:p-2 text-amber-600 hover:bg-amber-50 active:bg-amber-100 rounded-lg transition-colors touch-manipulation hidden sm:block"
                          title="Remove Admin"
                        >
                          <ShieldOff size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowEdit(false)} />
          <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6">
              {creatingAdmin ? 'Add New Admin' : 'Edit Member'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-1.5">Title</label>
                <input
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  placeholder="Mr., Mrs., Dr."
                  value={editing.title || ''}
                  onChange={(e) => setEditing((s) => ({ ...s, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-1.5">First Name</label>
                <input
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  value={editing.name || ''}
                  onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-1.5">Last Name</label>
                <input
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  value={editing.lastName || ''}
                  onChange={(e) => setEditing((s) => ({ ...s, lastName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-1.5">Email</label>
                <input
                  type="email"
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  value={editing.email || ''}
                  onChange={(e) => setEditing((s) => ({ ...s, email: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-1.5">Phone</label>
                <input
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  value={editing.phone || ''}
                  onChange={(e) => setEditing((s) => ({ ...s, phone: e.target.value }))}
                />
              </div>
              {!creatingAdmin && (
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editing.approved}
                      onChange={(e) => setEditing((s) => ({ ...s, approved: e.target.checked }))}
                      className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs sm:text-sm font-medium text-slate-700">Approved</span>
                  </label>
                </div>
              )}
            </div>
            <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowEdit(false)}
                className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
