import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, BarChart3,
  Settings, LogOut, QrCode, ClipboardList, FileText, ScanLine,
  History, User, ChevronLeft, ChevronRight, X, UserPlus,
  TrendingUp, Building2, CalendarCheck, Layers
} from 'lucide-react'

const navConfig = {
  admin: [
    { to: '/admin/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, end: true },
    { to: '/admin/departments',  label: 'Departments',  icon: Building2 },
    { to: '/admin/lecturers',    label: 'Lecturers',    icon: GraduationCap },
    { to: '/admin/units',        label: 'Units',        icon: Layers },
    { to: '/admin/students',     label: 'Students',     icon: Users },
    { to: '/admin/registrations', label: 'Registrations', icon: UserPlus },
    { to: '/admin/sessions',     label: 'Sessions',     icon: CalendarCheck },
    { to: '/admin/reports',      label: 'Reports',      icon: BarChart3 },
    { to: '/admin/analytics',    label: 'Analytics',    icon: TrendingUp },
    { to: '/admin/settings',     label: 'Settings',     icon: Settings },
  ],
  lecturer: [
    { to: '/lecturer/dashboard', label: 'Dashboard',    icon: LayoutDashboard, end: true },
    { to: '/lecturer/courses',   label: 'My Units',     icon: BookOpen },
    { to: '/lecturer/session',   label: 'Start Session',icon: QrCode },
    { to: '/lecturer/attendance',label: 'Attendance',   icon: ClipboardList },
    { to: '/lecturer/export',    label: 'Reports',      icon: FileText },
  ],
  hod: [
    { to: '/hod/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/hod/courses',   label: 'Courses',   icon: BookOpen },
    { to: '/hod/sessions',  label: 'Sessions',  icon: CalendarCheck },
    { to: '/hod/lecturers', label: 'Faculty',   icon: GraduationCap },
    { to: '/hod/reports',   label: 'Reports',   icon: FileText },
  ],
  student: [
    { to: '/student/dashboard',  label: 'Dashboard',    icon: LayoutDashboard, end: true },
    { to: '/student/scanner',    label: 'Scan QR',      icon: ScanLine },
    { to: '/student/history',    label: 'History',      icon: History },
    { to: '/student/profile',    label: 'Profile',      icon: User },
  ],
}

// Group admin nav into sections
const adminSections = [
  {
    label: 'Overview',
    items: ['Dashboard'],
  },
  {
    label: 'Management',
    items: ['Departments', 'Lecturers', 'Units', 'Students', 'Registrations', 'Sessions'],
  },
  {
    label: 'Insights',
    items: ['Reports', 'Analytics'],
  },
  {
    label: 'System',
    items: ['Settings'],
  },
]

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
    admin:    'Admin Portal',
    lecturer: 'Lecturer Portal',
    hod:      'HOD Portal',
    student:  'Student Portal',
  }[user?.role] || 'Portal'

  const renderLinks = (filterLabels) => {
    const filtered = filterLabels
      ? links.filter(l => filterLabels.includes(l.label))
      : links

    return filtered.map(({ to, label, icon: Icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={onMobileClose}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
           ${isActive
             ? 'text-white shadow-md'
             : 'text-slate-400 hover:text-white hover:bg-white/10'
           }
           ${collapsed ? 'justify-center' : ''}`
        }
        style={({ isActive }) => isActive ? { background: '#0057A8' } : {}}
        title={collapsed ? label : undefined}
      >
        <Icon size={18} className="flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </NavLink>
    ))
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Brand ── */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b ${collapsed ? 'justify-center' : ''}`}
        style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{ background: '#FFC107' }}>
          <GraduationCap size={20} style={{ color: '#003D7A' }} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden leading-tight">
            <p className="text-white font-extrabold text-base tracking-wide">MKU-CAMS</p>
            <p className="text-xs leading-tight" style={{ color: '#FFC107' }}>Campus Attendance</p>
          </div>
        )}
        <button onClick={onMobileClose} className="ml-auto lg:hidden text-slate-400 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {user?.role === 'admin' && !collapsed
          ? adminSections.map(section => {
              const sectionLinks = links.filter(l => section.items.includes(l.label))
              if (!sectionLinks.length) return null
              return (
                <div key={section.label} className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {renderLinks(section.items)}
                  </div>
                </div>
              )
            })
          : (
            <div className="space-y-0.5">
              {renderLinks(null)}
            </div>
          )
        }
      </nav>

      {/* ── User info + Logout ── */}
      <div className="px-3 py-4 border-t border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: '#FFC107', color: '#003D7A' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-slate-400 text-[11px] truncate">{user?.email || user?.reg_number}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            text-slate-400 hover:text-white hover:bg-red-500/20 transition-all mt-1
            ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* ── Collapse toggle (desktop) ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="hidden lg:flex items-center justify-center py-3 border-t border-white/10 text-slate-500 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className={`hidden lg:flex flex-col h-screen sticky top-0 flex-shrink-0 sidebar-transition ${collapsed ? 'w-16' : 'w-60'}`}
        style={{ background: '#003D7A' }}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="relative w-60 h-full flex flex-col slide-in-left z-50"
            style={{ background: '#003D7A' }}>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
