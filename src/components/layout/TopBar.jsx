import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Menu, Bell, LogOut, User, ChevronDown } from 'lucide-react'

export default function TopBar({ onMenuClick, title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const profileRoute = {
    admin:    '/admin',
    lecturer: '/lecturer',
    hod:      '/hod/dashboard',
    student:  '/student/profile',
  }[user?.role]

  return (
    <header className="bg-white px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30"
      style={{ borderBottom: '2px solid #0057A8' }}>
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <Menu size={20} />
        </button>
        {title && <h1 className="text-base font-semibold text-slate-800 hidden sm:block">{title}</h1>}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Bell */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          style={{ color: '#0057A8' }}>
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#FFC107' }} />
        </button>

        {/* Avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: '#0057A8' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-700 leading-tight">{user?.name}</p>
              <p className="text-xs capitalize" style={{ color: '#0057A8' }}>{user?.role} · MKU-CAMS</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 fade-in">
                <button
                  onClick={() => { navigate(profileRoute); setDropdownOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <User size={15} /> Profile
                </button>
                <hr className="my-1 border-slate-100" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
