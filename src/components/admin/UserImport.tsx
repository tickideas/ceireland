'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Download, FileText, Check, AlertCircle, X, Users, Loader2 } from 'lucide-react'

interface UserData {
  title: string
  name: string
  lastName: string
  email: string
  phone: string
  approved?: boolean | string
}

interface ResultBase { 
  email: string
  row: number 
}
type CreatedResult = ResultBase & { status: 'created'; id: string }
type DuplicateResult = ResultBase & { status: 'duplicate'; id: string }
type ErrorResult = ResultBase & { status: 'error'; message: string }
type ImportResult = CreatedResult | DuplicateResult | ErrorResult

export default function UserImport() {
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [previewData, setPreviewData] = useState<UserData[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [headerErrors, setHeaderErrors] = useState<string[]>([])

  const requiredHeaders = ['title','name','lastName','email','phone','approved']

  const validateHeaders = (headers: string[]) => {
    const missing = requiredHeaders.filter(h => !headers.includes(h))
    setHeaderErrors(missing.length ? missing.map(m => `Missing header: ${m}`) : [])
    return missing.length === 0
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    },
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (!file) return

      try {
        const text = await file.text()
        let data: UserData[] = []

        if (file.name.endsWith('.csv')) {
          const lines = text.split(/\r?\n/)
          const headers = lines[0].split(',').map(h => h.trim())

          if (!validateHeaders(headers)) {
            return
          }
          
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
              const userData: Record<string, string> = {}
              headers.forEach((header, index) => {
                userData[header] = values[index]
              })
              data.push(userData as unknown as UserData)
            }
          }
        } else if (file.name.endsWith('.json')) {
          data = JSON.parse(text)
        }

        setPreviewData(data)
        setShowPreview(true)
      } catch {
        alert('Failed to parse file. Please check the format.')
      }
    }
  })

  const handleImport = async () => {
    if (previewData.length === 0) return

    setUploading(true)
    try {
      const response = await fetch('/api/admin/users/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: previewData })
      })

      const result = await response.json()
      setResults(result.results || [])
      setShowPreview(false)
      setPreviewData([])
    } catch {
      alert('Failed to import members')
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      ['title', 'name', 'lastName', 'email', 'phone', 'approved'],
      ['Bro.', 'John', 'Doe', 'john@example.com', '+1234567890', 'true'],
      ['Sis.', 'Jane', 'Smith', 'jane@example.com', '+1234567891', 'true']
    ]
    
    const csv = template.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'member_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportErrors = () => {
    if (!results.length) return
    const errorRows = results.filter(r => r.status === 'error' || r.status === 'duplicate')
    if (!errorRows.length) return
    const header = 'row,email,status,message' 
    const lines = errorRows.map(r => {
      const message = r.status === 'error' ? (r.message || '').replace(/,/g,';') : 'Duplicate'
      return [r.row, r.email, r.status, message].join(',')
    })
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import_errors.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const createdCount = results.filter(r => r.status === 'created').length
  const duplicateCount = results.filter(r => r.status === 'duplicate').length
  const errorCount = results.filter(r => r.status === 'error').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mt-1">
            Bulk import members from CSV or JSON files
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Download size={18} />
          <span>Download Template</span>
        </button>
      </div>

      {/* Upload Zone */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div
          {...getRootProps()}
          className={`p-12 border-2 border-dashed rounded-xl m-6 text-center cursor-pointer transition-all duration-200 ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          }`}
        >
          <input {...getInputProps()} />
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-colors ${
            isDragActive ? 'bg-blue-100' : 'bg-slate-100'
          }`}>
            <Upload className={`w-8 h-8 ${isDragActive ? 'text-blue-600' : 'text-slate-400'}`} />
          </div>
          <p className="text-lg font-medium text-slate-900 mb-2">
            {isDragActive ? 'Drop your file here' : 'Drop your CSV or JSON file here'}
          </p>
          <p className="text-sm text-slate-500">
            or click to browse files
          </p>
          <p className="text-xs text-slate-400 mt-4">
            Supports .csv and .json files
          </p>
        </div>
      </div>

      {/* Header Errors */}
      {headerErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              {headerErrors.map((e, i) => (
                <p key={i} className="text-sm text-red-700">{e}</p>
              ))}
              <p className="text-sm text-red-600 font-medium mt-2">
                Please correct the CSV headers and re-upload.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {showPreview && headerErrors.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Preview Data</h3>
                <p className="text-sm text-slate-500">{previewData.length} records ready to import</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => { setShowPreview(false); setPreviewData([]) }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={uploading}
                className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-lg shadow-blue-500/25"
              >
                {uploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Users size={18} />
                    <span>Import {previewData.length} Members</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Last Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Approved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.slice(0, 10).map((user, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-sm text-slate-900">{user.title}</td>
                    <td className="px-6 py-3 text-sm text-slate-900">{user.name}</td>
                    <td className="px-6 py-3 text-sm text-slate-900">{user.lastName}</td>
                    <td className="px-6 py-3 text-sm text-slate-900">{user.email}</td>
                    <td className="px-6 py-3 text-sm text-slate-900">{user.phone}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {user.approved ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 10 && (
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
                Showing first 10 of {previewData.length} records
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900">Import Results</h3>
              <p className="text-sm text-slate-500 mt-1">
                {createdCount} created, {duplicateCount} duplicates, {errorCount} errors
              </p>
            </div>
            {(duplicateCount > 0 || errorCount > 0) && (
              <button
                onClick={exportErrors}
                className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Download size={16} />
                <span>Download Errors CSV</span>
              </button>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-100">
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-700">{createdCount}</p>
              <p className="text-sm text-emerald-600">Created</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-700">{duplicateCount}</p>
              <p className="text-sm text-amber-600">Duplicates</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-700">{errorCount}</p>
              <p className="text-sm text-red-600">Errors</p>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-2 max-h-80 overflow-y-auto">
            {results.map((r, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  r.status === 'created' 
                    ? 'bg-emerald-50' 
                    : r.status === 'duplicate' 
                      ? 'bg-amber-50' 
                      : 'bg-red-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-slate-500">#{r.row}</span>
                  <span className="font-medium text-slate-900">{r.email}</span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  r.status === 'created'
                    ? 'bg-emerald-200 text-emerald-800'
                    : r.status === 'duplicate'
                      ? 'bg-amber-200 text-amber-800'
                      : 'bg-red-200 text-red-800'
                }`}>
                  {r.status === 'created' && 'Created'}
                  {r.status === 'duplicate' && 'Duplicate'}
                  {r.status === 'error' && `Error: ${r.message}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
