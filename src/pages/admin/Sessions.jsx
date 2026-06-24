import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import {
  CalendarCheck, Clock, Users, X, Search, Filter,
  ChevronDown, CheckCircle, XCircle, AlertCircle, Eye
} from 'lucide-react'
import api from '../../services/api'

const MOCK_SESSIONS = Array.from({ length: 20 }, (_, i) => {
  const units = ['Data Structures','Database Systems','Web Technologies','Business Math','Engineering Drawing','Networks','OS Fundamentals','Linear Algebra']
  const lecturers = ['Dr. James Mwangi','Prof. Sarah Kamau','Dr. Peter Odhiambo','Ms. Grace Njeri','Dr. Michael Otieno']
  const depts = ['SCIT','SBUS','SENG','SHS','SEDU']
  const present = Math.floor(Math.random() * 80) + 30
  const total = present + Math.floor(Math.random() * 30) + 10
  const start = new Date(Date.now() - (i * 3600000 * 6))
  const end = new Date(start.getTime() + 600000) // 10 min window
  return {
    id: i + 1,
    unit: units[i % units.length],
    unit_code: `CODE${String(i + 1).padStart(3,'0')}`,
    lecturer: lecturers[i % lecturers.length],
    dept: depts[i % depts.length],
    date: start.toISOString().split('T')[0],
    start_time: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    end_time: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    present,
    total,
    status: i < 2 ? 'active' : 'closed',
    attendance: Array.from({ length: present }, (_, j) => ({
      id: j + 1,
      name: ['Alice Wanjiku','Brian Otieno','Carol Muthoni','David Kamau','Eve Njeri','Faith Auma','George Maina'][j % 7] + ` ${j + 1}`,
      reg: `SCT211-${String(j + 1).padStart(4,'0')}/2024`,
      time: new Date(start.getTime() + j * 30000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      method: j % 5 === 0 ? 'USSD' : j % 7 === 0 ? 'SMS' : 'QR',
    })),
  }
})

const STATUS_STYLES = {
  active:  { bg: '#D1FAE5', color: '#065F46', icon: CheckCircle, label: 'Active' },
  closed:  { bg: '#F1F5F9', color: '#475569', icon: XCircle, label: 'Closed' },
  expired: { bg: '#FEE2E2', color: '#991B1B', icon: AlertCircle, label: 'Expired' },
}

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortCol, setSortCol] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [panel, setPanel] = useState(null)   // selected session for side panel

  useEffect(() => {
    setLoading(true)
    api.get('/admin/sessions').catch(() => null).then(res => {
      setSessions(res?.data?.sessions || res?.data || MOCK_SESSIONS)
      setLoading(false)
    })
  }, [])

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = sessions.filter(s => {
    if (search && !s.unit.toLowerCase().includes(search.toLowerCase()) && !s.lecturer.toLowerCase().includes(search.toLowerCase())) return false
    if (deptFilter && s.dept !== deptFilter) return false
    if (statusFilter && s.status !== statusFilter) return false
    if (dateFrom && s.date < dateFrom) return false
    if (dateTo && s.date > dateTo) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortCol], vb = b[sortCol]
    if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
    return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
  })

  const SortArrow = ({ col }) => (
    <span className="ml-1 text-xs" style={{ opacity: sortCol === col ? 1 : 0.3 }}>
      {sortCol === col && sortDir === 'desc' ? '↓' : '↑'}
    </span>
  )

  const uniqueDepts = [...new Set(sessions.map(s => s.dept))]

  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.status === 'active').length,
    today: sessions.filter(s => s.date === new Date().toISOString().split('T')[0]).length,
    avgPresent: sessions.length ? Math.round(sessions.reduce((a, s) => a + s.present, 0) / sessions.length) : 0,
  }

  return (
    <PageWrapper title="Sessions">
      <div className="flex gap-6 page-enter" style={{ minHeight: 0 }}>
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Sessions</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {stats.active} active · {stats.today} today · {stats.total} total
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#D1FAE5', color: '#065F46' }}>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {stats.active} Live Session{stats.active !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Sessions', value: stats.total, clr: '#0057A8', bg: '#E8F1FB' },
              { label: 'Active Now', value: stats.active, clr: '#059669', bg: '#D1FAE5' },
              { label: 'Today', value: stats.today, clr: '#7C3AED', bg: '#EDE9FE' },
              { label: 'Avg Present', value: stats.avgPresent, clr: '#D97706', bg: '#FEF3C7' },
            ].map(s => (
              <div key={s.label} className="mku-card py-4 text-center">
                <p className="text-2xl font-bold" style={{ color: s.clr }}>{loading ? '…' : s.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="mku-card p-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
              <input type="text" placeholder="Search unit or lecturer…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-base pl-9 py-2 text-sm w-full" />
            </div>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="input-base py-2 text-sm w-40">
              <option value="">All Depts</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="input-base py-2 text-sm w-36">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="input-base py-2 text-sm w-36" title="From date" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="input-base py-2 text-sm w-36" title="To date" />
            {(search || deptFilter || statusFilter || dateFrom || dateTo) && (
              <button onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('') }}
                className="btn btn-secondary py-2 text-sm">Clear</button>
            )}
          </div>

          {/* Table */}
          <div className="mku-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--mku-gray-100)', borderBottom: '1px solid var(--border-color)' }}>
                    {[
                      { label: 'Unit', col: 'unit' },
                      { label: 'Lecturer', col: 'lecturer' },
                      { label: 'Date', col: 'date' },
                      { label: 'Time', col: 'start_time' },
                      { label: 'Present', col: 'present' },
                      { label: 'Status', col: 'status' },
                      { label: '', col: null },
                    ].map(h => (
                      <th key={h.label} onClick={() => h.col && handleSort(h.col)}
                        className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${h.col ? 'cursor-pointer select-none' : ''}`}
                        style={{ color: 'var(--text-secondary)' }}>
                        {h.label}{h.col && <SortArrow col={h.col} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-5 py-4"><div className="skeleton h-4 rounded w-3/4" /></td>
                        ))}
                      </tr>
                    ))
                    : sorted.length === 0
                      ? (
                        <tr><td colSpan={7} className="py-16 text-center">
                          <CalendarCheck size={40} className="mx-auto mb-3" style={{ color: 'var(--border-color)' }} />
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No sessions match your filters.</p>
                        </td></tr>
                      )
                      : sorted.map(s => {
                        const st = STATUS_STYLES[s.status] || STATUS_STYLES.closed
                        const pct = s.total ? Math.round((s.present / s.total) * 100) : 0
                        return (
                          <tr key={s.id} className="table-row-hover"
                            style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                              background: panel?.id === s.id ? 'var(--mku-blue-light)' : undefined }}
                            onClick={() => setPanel(p => p?.id === s.id ? null : s)}>
                            <td className="px-5 py-4">
                              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.unit}</p>
                              <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{s.unit_code}</p>
                            </td>
                            <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{s.lecturer}</td>
                            <td className="px-5 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                              {new Date(s.date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <Clock size={12} />
                                {s.start_time} – {s.end_time}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.present}</span>
                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>/ {s.total}</span>
                                <span className={`text-xs font-bold ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                  {pct}%
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                                style={{ background: st.bg, color: st.color }}>
                                {s.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                                {st.label}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <button onClick={e => { e.stopPropagation(); setPanel(p => p?.id === s.id ? null : s) }}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: 'var(--mku-blue)' }} title="View attendance">
                                <Eye size={15} />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        {panel && (
          <div className="w-80 flex-shrink-0 slide-in-right" style={{ position: 'sticky', top: '80px', alignSelf: 'flex-start' }}>
            <div className="mku-card p-0 overflow-hidden" style={{ maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
              {/* Panel Header */}
              <div className="p-5" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--mku-blue-dark)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-white">{panel.unit}</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>{panel.lecturer}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {new Date(panel.date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })} · {panel.start_time}
                    </p>
                  </div>
                  <button onClick={() => setPanel(null)} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
                    <X size={16} />
                  </button>
                </div>
                {/* Attendance summary */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Present', val: panel.present, clr: '#34D399' },
                    { label: 'Absent', val: panel.total - panel.present, clr: '#F87171' },
                    { label: 'Rate', val: `${panel.total ? Math.round((panel.present / panel.total) * 100) : 0}%`, clr: '#FCD34D' },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <p className="text-lg font-bold" style={{ color: s.clr }}>{s.val}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <div className="h-1.5 rounded-full transition-all"
                    style={{ width: `${panel.total ? (panel.present / panel.total) * 100 : 0}%`, background: '#34D399' }} />
                </div>
              </div>

              {/* Attendance list */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Attendance List ({panel.attendance.length} students)
                  </p>
                </div>
                {panel.attendance.length === 0
                  ? (
                    <div className="p-8 text-center">
                      <Users size={32} className="mx-auto mb-2" style={{ color: 'var(--border-color)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No check-ins yet</p>
                    </div>
                  )
                  : panel.attendance.map((a, idx) => (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-3 table-row-hover"
                      style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--mku-blue)' }}>
                        {a.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                        <p className="text-xs font-mono truncate" style={{ color: 'var(--text-secondary)' }}>{a.reg}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{a.time}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: a.method === 'QR' ? '#E8F1FB' : a.method === 'USSD' ? '#EDE9FE' : '#FEF3C7',
                            color: a.method === 'QR' ? '#0057A8' : a.method === 'USSD' ? '#7C3AED' : '#D97706' }}>
                          {a.method}
                        </span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
