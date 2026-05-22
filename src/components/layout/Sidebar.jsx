import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, BarChart3,
  Settings, LogOut, QrCode, ClipboardList, FileText, ScanLine,
  History, User, ChevronLeft, ChevronRight, Menu, X, School
} from 'lucide-react'

const navConfig = {
  admin: [
    { to: '/admin',           label: 'Dashboard',   icon: LayoutDashboard, end: true },
    { to: '/admin/students',  label: 'Students',    icon: Users },
    { to: '/admin/lecturers', label: 'Lecturers',   icon: GraduationCap },
    { to: '/admin/courses',   label: 'Courses',     icon: BookOpen },
    { to: '/admin/reports',   label: 'Reports',     icon: BarChart3 },
    { to: '/admin/settings',  label: 'Settings',    icon: Settings },
  ],
  lecturer: [
    { to: '/lecturer',            label: 'Dashboard',   icon: LayoutDashboard, end: true },
    { to: '/lecturer/courses',    label: 'My Courses',  icon: BookOpen },
    { to: '/lecturer/session',    label: 'Start Session', icon: QrCode },
    { to: '/lecturer/attendance', label: 'Attendance',  icon: ClipboardList },
    { to: '/lecturer/export',     label: 'Reports',     icon: FileText },
  ],
  student: [
    { to: '/student',          label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/student/scanner',  label: 'Scan QR',   icon: ScanLine },
    { to: '/student/history',  label: 'History',   icon: History },
    { to: '/student/profile',  label: 'Profile',   icon: User },
  ],
}

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const links = navConfig[user?.role] || []

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const roleLabel = {
    admin: 'Admin Portal',
    lecturer: 'Lecturer Portal',
    student: 'Student Portal',
  }[user?.role] || 'Portal'

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <School size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">MKU</p>
            <p className="text-slate-400 text-xs">{roleLabel}</p>
          </div>
        )}
        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="ml-auto lg:hidden text-slate-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
               ${isActive
                 ? 'bg-green-600 text-white shadow-lg shadow-green-900/30'
                 : 'text-slate-400 hover:text-white hover:bg-white/10'
               }
               ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs truncate">{user?.email || user?.reg_number}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-red-600/20 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="hidden lg:flex items-center justify-center py-3 border-t border-white/10 text-slate-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#0F172A] h-screen sticky top-0 flex-shrink-0 sidebar-transition
          ${collapsed ? 'w-16' : 'w-60'}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onMobileClose}
          />
          <aside className="relative w-64 bg-[#0F172A] h-full flex flex-col slide-in-left z-50">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
