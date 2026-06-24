import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { X, Search } from 'lucide-react'

const SHORTCUTS = {
  admin: [
    { keys: ['Ctrl','N'], label: 'New student registration', action: '/admin/registrations' },
    { keys: ['Ctrl','R'], label: 'Reports page', action: '/admin/reports' },
    { keys: ['Ctrl','A'], label: 'Analytics', action: '/admin/analytics' },
  ],
  lecturer: [
    { keys: ['Ctrl','O'], label: 'Open new session', action: '/lecturer/session' },
    { keys: ['Ctrl','Q'], label: 'Show QR fullscreen', action: 'qr' },
    { keys: ['Ctrl','X'], label: 'Close current session', action: 'close_session' },
  ],
  student: [
    { keys: ['Ctrl','S'], label: 'Scan QR', action: '/student/scanner' },
    { keys: ['Ctrl','H'], label: 'Attendance history', action: '/student/history' },
  ],
  global: [
    { keys: ['Ctrl','K'], label: 'Quick search', action: 'search' },
    { keys: ['Ctrl','/'], label: 'Show keyboard shortcuts', action: 'help' },
  ],
}

// Global search modal
function SearchModal({ onClose }) {
  const [q, setQ] = useState('')
  const navigate  = useNavigate()

  return (
    <div className="fixed inset-0 z-[9500] flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-lg p-4 fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <Search size={18} className="text-[var(--text-secondary)]" />
          <input
            autoFocus
            type="text"
            className="flex-1 bg-transparent outline-none text-[var(--text-primary)] text-base placeholder:text-[var(--text-secondary)]"
            placeholder="Search students, courses, sessions…"
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Quick search"
          />
          <button onClick={onClose} aria-label="Close search"><X size={18} /></button>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-2">Type to search across the system. Press Esc to close.</p>
      </div>
    </div>
  )
}

// Help modal
function HelpModal({ role, onClose }) {
  const roleShortcuts = SHORTCUTS[role] || []
  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-md p-6 fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="space-y-1">
          {[...SHORTCUTS.global, ...roleShortcuts].map(({ keys, label }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0">
              <span className="text-sm text-[var(--text-primary)]">{label}</span>
              <div className="flex gap-1">
                {keys.map((k, i) => (
                  <span key={i} className="shortcut-key">{k}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function KeyboardShortcuts() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [showSearch, setShowSearch] = useState(false)
  const [showHelp,   setShowHelp]   = useState(false)

  const handle = useCallback((e) => {
    if (!user) return
    const ctrl = e.ctrlKey || e.metaKey
    if (!ctrl) return

    const key = e.key.toLowerCase()

    // Global
    if (key === 'k') { e.preventDefault(); setShowSearch(s => !s); return }
    if (key === '/') { e.preventDefault(); setShowHelp(s => !s);   return }

    // Role-specific
    if (user.role === 'admin') {
      if (key === 'n') { e.preventDefault(); navigate('/admin/registrations'); return }
      if (key === 'r') { e.preventDefault(); navigate('/admin/reports'); return }
      if (key === 'a') { e.preventDefault(); navigate('/admin/analytics'); return }
    }
    if (user.role === 'lecturer') {
      if (key === 'o') { e.preventDefault(); navigate('/lecturer/session'); return }
    }
    if (user.role === 'student') {
      if (key === 's') { e.preventDefault(); navigate('/student/scanner'); return }
    }

    // Escape
    if (e.key === 'Escape') {
      setShowSearch(false)
      setShowHelp(false)
    }
  }, [user, navigate])

  useEffect(() => {
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [handle])

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') { setShowSearch(false); setShowHelp(false) }
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  return (
    <>
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      {showHelp   && <HelpModal role={user?.role} onClose={() => setShowHelp(false)} />}
    </>
  )
}
