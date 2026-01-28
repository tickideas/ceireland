'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts'
import { Users, UserCheck, Clock, Eye, TrendingUp, Download, Calendar, Activity } from 'lucide-react'

interface Analytics {
  totalUsers: number
  approvedUsers: number
  pendingUsers: number
  todayAttendance: number
  weekAttendance: number
  monthAttendance: number
  serviceData: Array<{
    date: string
    attendance: number
    dayName: string
  }>
  weeklyTrend: Array<{
    week: string
    attendance: number
  }>
  roleDistribution: Array<{
    name: string
    value: number
    color: string
  }>
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  gradient 
}: { 
  title: string
  value: number | string
  icon: React.ElementType
  trend?: string
  gradient: string
}) => (
  <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 hover:shadow-lg transition-all duration-300 group">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {trend && (
          <div className="flex items-center space-x-1 text-emerald-600">
            <TrendingUp size={14} />
            <span className="text-xs font-medium">{trend}</span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-5`} />
  </div>
)

const ChartCard = ({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden ${className}`}>
    <div className="px-6 py-4 border-b border-slate-100">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
)

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('month')
  const [granularity, setGranularity] = useState<'day' | 'month' | 'year'>('month')
  const [series, setSeries] = useState<Array<{ label: string; usersCreated: number; usersApprovedCreated: number; attendanceCount: number; servicesCount: number }>>([])
  const [seriesLoading, setSeriesLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [dateFilter])

  useEffect(() => {
    fetchTimeseries()
  }, [granularity])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics?period=${dateFilter}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTimeseries = async () => {
    try {
      setSeriesLoading(true)
      const res = await fetch(`/api/admin/analytics/timeseries?granularity=${granularity}`)
      if (res.ok) {
        const data = await res.json()
        setSeries(data.data)
      }
    } catch (e) {
      console.error('Failed to fetch timeseries:', e)
    } finally {
      setSeriesLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <Activity className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="text-slate-600">Failed to load analytics data</p>
        </div>
      </div>
    )
  }

  const formatIsoToDMY = (value: string) => {
    if (!value) return value
    const parts = value.split('-')
    if (parts.length === 3) {
      const [, m, d] = parts
      return `${d}/${m}`
    }
    return value
  }

  const handleDownloadCSV = () => {
    const a = document.createElement('a')
    a.href = `/api/admin/analytics/timeseries?granularity=${granularity}&format=csv`
    a.download = `timeseries_${granularity}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const avgDailyAttendance = analytics.serviceData.length > 0
    ? Math.round(analytics.serviceData.reduce((sum, d) => sum + d.attendance, 0) / analytics.serviceData.length)
    : 0
  const totalAttendance = analytics.serviceData.reduce((sum, d) => sum + d.attendance, 0)
  const daysWithActivity = analytics.serviceData.filter(d => d.attendance > 0).length

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="year">Last year</option>
            </select>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as 'day' | 'month' | 'year')}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleDownloadCSV}
          className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Members"
          value={analytics.totalUsers}
          icon={Users}
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          title="Approved Members"
          value={analytics.approvedUsers}
          icon={UserCheck}
          gradient="from-emerald-500 to-emerald-600"
        />
        <StatCard
          title="Pending Approval"
          value={analytics.pendingUsers}
          icon={Clock}
          gradient="from-amber-500 to-orange-500"
        />
        <StatCard
          title="Today's Viewers"
          value={analytics.todayAttendance}
          icon={Eye}
          gradient="from-blue-500 to-blue-600"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Daily Attendance">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.serviceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={formatIsoToDMY} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                labelFormatter={(value) => {
                  const item = analytics.serviceData.find(d => d.date === value)
                  return item ? `${formatIsoToDMY(value)} (${item.dayName})` : formatIsoToDMY(value)
                }}
              />
              <Bar dataKey="attendance" fill="#6366f1" name="Attendance" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={`Attendance Trend (${granularity})`}>
          {seriesLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="attendanceCount"
                  name="Attendance"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#attendanceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Member Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.roleDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {analytics.roleDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Attendance Summary">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4">
                <p className="text-sm text-slate-500 mb-1">This Week</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.weekAttendance}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4">
                <p className="text-sm text-slate-500 mb-1">This Month</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.monthAttendance}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <span className="text-sm font-medium text-blue-900">Avg Daily Attendance</span>
                <span className="text-lg font-bold text-blue-600">{avgDailyAttendance}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                <span className="text-sm font-medium text-emerald-900">Total Attendance (Period)</span>
                <span className="text-lg font-bold text-emerald-600">{totalAttendance}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-violet-50 rounded-xl">
                <span className="text-sm font-medium text-violet-900">Days with Activity</span>
                <span className="text-lg font-bold text-violet-600">{daysWithActivity}</span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Full Width Chart */}
      <ChartCard title={`Complete Data Overview (by ${granularity})`}>
        {seriesLoading ? (
          <div className="h-[340px] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="usersCreated" name="Members Created" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="usersApprovedCreated" name="Approved Members" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="attendanceCount" name="Attendance" stroke="#7c3aed" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="servicesCount" name="Services" stroke="#f43f5e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}
