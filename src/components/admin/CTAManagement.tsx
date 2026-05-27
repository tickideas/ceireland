'use client'

import { useState } from 'react'
import { Heart, HandHeart, Cross } from 'lucide-react'
import SettingsTab from './cta/SettingsTab'
import PrayersTab from './cta/PrayersTab'
import SalvationTab from './cta/SalvationTab'

type ActiveTab = 'settings' | 'prayers' | 'salvation'

export default function CTAManagement() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('settings')
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  // Each tab stores its callback in a useRef internally, so we can pass the
  // raw state setters (referentially stable by React contract) without an
  // identity-stabilising wrapper here.

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Heart size={18} />
              <span>Button Settings</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('prayers')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'prayers'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <HandHeart size={18} />
              <span>Prayer Requests</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('salvation')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'salvation'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Cross size={18} />
              <span>Salvation</span>
              {pendingCount > 0 && (
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'prayers' && <PrayersTab onUnreadCountChange={setUnreadCount} />}
          {activeTab === 'salvation' && <SalvationTab onPendingCountChange={setPendingCount} />}
        </div>
      </div>
    </div>
  )
}
