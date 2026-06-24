import React, { useState, useEffect } from 'react'
import { X, Bell, CheckCircle2, AlertTriangle, BookOpen, Megaphone, User, GraduationCap, Clock } from 'lucide-react'
import api from '../../services/api'

const ICON_MAP = {
  session_opened:   { icon: Bell,         color: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-900/20' },
  attendance_marked:{ icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  low_attendance:   { icon: AlertTriangle,color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  announcement:     { icon: Megaphone,    color: 'text-purple-500',bg: 'bg-purple-50 dark:bg-purple-900/20' },
  account_update:   { icon: User,         color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20' },
  added_to_course:  { icon: GraduationCap,color: 'text-mku-blue',  bg: 'bg-blue-50 dark:bg-blue-900/20' },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function groupNotifs(notifs) {
  const now = Date.now()
  const today  = []
  const week   = []
  const older  = []
  notifs.forEach(n => {
    const diff = now - new Date(n.created_at).getTime()
    if (diff < 86400000)      today.push(n)
    else if (diff < 604800000) week.push(n)
    else                       older.push(n)
  })
  return { today, week, older }
}

function NotifItem({ notif, onRead }) {
  const cfg = ICON_MAP[notif.type] || ICON_MAP.account_update
  const Icon = cfg.icon
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border-color)] transition-colors ${
        notif.is_read ? 'opacity-60' : 'bg-[var(--mku-blue-light)]/30'
      }`}
    >
      <div className={`p-2 rounded-full flex-shrink-0 ${cfg.bg}`}>
        <Icon size={14} className={cfg.color} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{notif.title}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{notif.body}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
          <Clock size={10} /> {timeAgo(notif.created_at)}
        </p>
      </div>
      {!notif.is_read && (
        <button
          onClick={() => onRead(notif.id)}
          className="text-xs text-mku-blue hover:underline flex-shrink-0"
          aria-label="Mark as read"
        >
          ✓
        </button>
      )}
    </div>
  )
}

function Section({ label, items, onRead }) {
  if (!items.length) return null
  return (
    <>
      <div className="px-4 py-2 bg-[var(--bg-primary)] sticky top-0">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{label}</p>
      </div>
      {items.map(n => <NotifItem key={n.id} notif={n} onRead={onRead} />)}
    </>
  )
}

export default function NotificationPanel({ onClose }) {
  const [notifs, setNotifs]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifs = () => {
    api.get('/notifications')
      .then(r => setNotifs(r.data.notifications || []))
      .catch(() => setNotifs([
        { id:1, type:'announcement',     title:'System Maintenance', body:'Server maintenance on Saturday 2am–4am.', created_at: new Date().toISOString(), is_read: false },
        { id:2, type:'low_attendance',   title:'Low Attendance Alert', body:'Your BCS303 attendance is below 75%.', created_at: new Date(Date.now()-3600000).toISOString(), is_read: false },
        { id:3, type:'attendance_marked',title:'Attendance Marked', body:'You were marked Present in BCS301.', created_at: new Date(Date.now()-86400000).toISOString(), is_read: true },
      ]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchNotifs() }, [])

  const markRead = (id) => {
    api.patch(`/notifications/${id}/read`).catch(() => {})
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = () => {
    api.patch('/notifications/read-all').catch(() => {})
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unread = notifs.filter(n => !n.is_read).length
  const { today, week, older } = groupNotifs(notifs)

  return (
    <>
      <div className="fixed inset-0 z-[190]" onClick={onClose} aria-hidden="true" />
      <aside className="notif-panel" aria-label="Notifications panel" role="complementary">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border-color)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[var(--mku-blue)]" />
            <h2 className="font-bold text-[var(--text-primary)]">Notifications</h2>
            {unread > 0 && (
              <span className="bg-mku-yellow text-mku-blue-dark text-xs font-bold px-2 py-0.5 rounded-full">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-mku-blue hover:underline">
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] text-[var(--text-secondary)]" aria-label="Close notifications">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <span className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <span className="skeleton block h-3 w-32" />
                    <span className="skeleton block h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-[var(--text-secondary)]">
              <Bell size={32} className="opacity-30 mb-3" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <>
              <Section label="Today"      items={today} onRead={markRead} />
              <Section label="This week"  items={week}  onRead={markRead} />
              <Section label="Earlier"    items={older} onRead={markRead} />
            </>
          )}
        </div>
      </aside>
    </>
  )
}
