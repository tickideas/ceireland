'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  Image,
  Radio,
  Settings,
  UserPlus,
  FileText,
  Calendar,
  CalendarClock,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Home,
  Heart
} from 'lucide-react'

export type AdminTab = 'dashboard' | 'users' | 'banners' | 'stream' | 'service' | 'schedules' | 'import' | 'reports' | 'openEvents' | 'cta'

interface AdminLayoutProps {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  children: React.ReactNode
}

const navItems: { id: AdminTab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, description: 'Analytics overview' },
  { id: 'users', label: 'Members', icon: <Users size={20} />, description: 'Manage members' },
  { id: 'banners', label: 'Banners', icon: <Image size={20} />, description: 'Carousel banners' },
  { id: 'stream', label: 'Stream', icon: <Radio size={20} />, description: 'Live stream settings' },
  { id: 'service', label: 'Service Info', icon: <Settings size={20} />, description: 'App configuration' },
  { id: 'schedules', label: 'Schedules', icon: <CalendarClock size={20} />, description: 'Service schedules' },
  { id: 'cta', label: 'CTA Buttons', icon: <Heart size={20} />, description: 'Giving, Prayer, Salvation' },
  { id: 'import', label: 'Import', icon: <UserPlus size={20} />, description: 'Bulk member import' },
  { id: 'reports', label: 'Reports', icon: <FileText size={20} />, description: 'Attendance reports' },
  { id: 'openEvents', label: 'Open Events', icon: <Calendar size={20} />, description: 'Public events' }
]

export default function AdminLayout({ activeTab, onTabChange, children }: AdminLayoutProps) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [_isMobile, setIsMobile] = useState(false)

  // Handle responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      // Auto-collapse sidebar on tablet (md-lg range)
      if (window.innerWidth >= 1024 && window.innerWidth < 1280) {
        setSidebarCollapsed(true)
      } else if (window.innerWidth >= 1280) {
        setSidebarCollapsed(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-white border-r border-slate-200 shadow-2xl
          transition-all duration-300 ease-in-out flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${sidebarCollapsed ? 'lg:w-20 xl:w-20' : 'lg:w-64 xl:w-72'}
          w-[280px]
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
          <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg truncate">Admin Panel</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronRight
              size={20}
              className={`transition-transform duration-300 ${sidebarCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
        </div>

        {/* User Info */}
        <div className={`p-4 border-b border-slate-100 shrink-0 ${sidebarCollapsed ? 'lg:p-2 lg:flex lg:justify-center' : ''}`}>
          <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold shrink-0 text-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className={`overflow-hidden ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <p className="font-medium text-slate-900 truncate text-sm">
                {user?.title} {user?.name} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </div>
        </div>

        {/* Go to Service - Quick Access */}
        <div className={`p-3 border-b border-slate-100 shrink-0 ${sidebarCollapsed ? 'lg:p-2' : ''}`}>
          <Link
            href="/dashboard"
            className={`
              w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-md shadow-emerald-500/25
              ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}
            `}
          >
            <Home size={20} className="shrink-0" />
            <span className={`font-medium text-sm ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Go to Service</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto min-h-0">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id)
                  setSidebarOpen(false)
                }}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                  {item.icon}
                </span>
                <div className={`text-left min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  <span className="font-medium block text-sm">{item.label}</span>
                  {!isActive && !sidebarCollapsed && (
                    <span className="text-xs text-slate-400 block truncate">{item.description}</span>
                  )}
                </div>
              </button>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className={`p-3 border-t border-slate-200 shrink-0 ${sidebarCollapsed ? 'lg:p-2' : ''}`}>
          <button
            onClick={logout}
            className={`
              w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200
              ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}
            `}
          >
            <LogOut size={20} className="shrink-0" />
            <span className={`font-medium text-sm ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20 xl:ml-20' : 'lg:ml-64 xl:ml-72'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200">
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6 xl:px-8">
            <div className="flex items-center space-x-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                aria-label="Open sidebar"
              >
                <Menu size={22} />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                  {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">
                  {navItems.find(n => n.id === activeTab)?.description}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Online</span>
              </div>
              {/* Mobile online indicator */}
              <div className="md:hidden flex items-center space-x-1.5 px-2 py-1 bg-green-50 text-green-700 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium">Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-4 lg:p-6 xl:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
