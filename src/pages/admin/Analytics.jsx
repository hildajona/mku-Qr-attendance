import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import { StatCardSkeleton, TableSkeleton } from '../../components/ui/Skeleton'
import OnboardingTour from '../../components/ui/OnboardingTour'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)
import { Users, TrendingUp, Calendar, AlertTriangle, Download, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

const MKU_COLORS = {
  blue:    '#0057A8',
  yellow:  '#FFC107',
  green:   '#16A34A',
  danger:  '#DC2626',
  accent:  '#4d9de0',
}

function StatCard({ label, value, icon: Icon, color, loading }) {
  if (loading) return <StatCardSkeleton />
  return (
    <div id="tour-analytics" className="mku-card flex items-center gap-4 count-up">
      <div className={`p-3 rounded-xl flex-shrink-0`} style={{ background: color + '22' }}>
        <Icon size={22} style={{ color }} aria-hidden="true" />
      </div>
      <div>
        <p className="text-2xl font-black text-[var(--text-primary)]">{value?.toLocaleString() ?? '—'}</p>
        <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function TrendBadge({ trend }) {
  if (trend === 'up')   return <span className="text-green-600 text-xs font-bold">↑</span>
  if (trend === 'down') return <span className="text-red-500 text-xs font-bold">↓</span>
  return <span className="text-slate-400 text-xs">→</span>
}

export default function AdminAnalytics() {
  const { user } = useAuth()
  const [overview, setOverview] = useState(null)
  const [trend,    setTrend]    = useState([])
  const [atRisk,   setAtRisk]   = useState([])
  const [heatmap,  setHeatmap]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [smsSending, setSmsSending] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [ov, tr, ar, hm] = await Promise.all([
          api.get('/analytics/admin/overview'),
          api.get('/analytics/admin/trend'),
          api.get('/analytics/admin/at-risk'),
          api.get('/analytics/admin/heatmap'),
        ])
        setOverview(ov.data)
        setTrend(tr.data.trend || [])
        setAtRisk(ar.data.students || [])
        setHeatmap(hm.data.heatmap || [])
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const sendWarning = async (student) => {
    setSmsSending(student.id)
    try {
      await api.post('/admin/sms-broadcast', {
        to: [student.phone || student.id],
        message: `MKU Attend: Dear ${student.name}, your attendance in ${student.course} is ${student.pct}%. You need ≥75% to sit your exam. Please attend remaining sessions.`
      })
      toast.success(`SMS sent to ${student.name}`)
    } catch { toast.error('Could not send SMS') }
    finally { setSmsSending(null) }
  }

  // Build heatmap grid
  const DAYS  = ['Mon','Tue','Wed','Thu','Fri']
  const HOURS = [8,9,10,11,12,13,14,15,16,17]
  const heatCell = (day, hour) => {
    const cell = heatmap.find(c => c.day?.slice(0,3) === day && parseInt(c.hour) === hour)
    return cell?.absences || 0
  }
  const maxAbsences = Math.max(...heatmap.map(c => c.absences || 0), 1)

  return (
    <PageWrapper title="Analytics">
      <OnboardingTour role={user?.role} />
      <div className="space-y-8 max-w-7xl mx-auto">

        {/* Row 1 — Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Students"     value={overview?.total_students} icon={Users}          color={MKU_COLORS.blue}   loading={loading} />
          <StatCard label="Avg Attendance"     value={overview?.avg_attendance !== undefined && overview?.avg_attendance !== null ? `${overview.avg_attendance}%` : null} icon={TrendingUp} color={MKU_COLORS.green}  loading={loading} />
          <StatCard label="Sessions (30 days)" value={overview?.total_sessions} icon={Calendar}        color={MKU_COLORS.yellow} loading={loading} />
          <StatCard label="At Risk Students"   value={overview?.at_risk_count}  icon={AlertTriangle}   color={MKU_COLORS.danger} loading={loading} />
        </div>

        {/* Row 2 — Trend chart */}
        <div className="mku-card">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Attendance Trend — Last 30 Days</h2>
          {loading ? (
            <div className="skeleton h-56 w-full" />
          ) : (
            <div style={{ height: 220 }}>
              <Line
                data={{
                  labels: trend.map(d => d.date?.slice(5) || d.date),
                  datasets: [{
                    label: 'Attendance %',
                    data: trend.map(d => d.pct ?? d.rate ?? 0),
                    borderColor: MKU_COLORS.blue,
                    backgroundColor: 'rgba(0,87,168,0.08)',
                    borderWidth: 2.5,
                    pointRadius: trend.length > 20 ? 0 : 3,
                    fill: true,
                    tension: 0.3,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: '#0F172A', cornerRadius: 8, padding: 10,
                      callbacks: { label: ctx => ` ${ctx.raw}%` } },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 11 } } },
                    y: { beginAtZero: true, max: 100, grid: { color: '#F1F5F9' },
                      ticks: { color: '#64748B', font: { size: 11 }, callback: v => `${v}%` } },
                  },
                }}
              />
            </div>
          )}
        </div>

        {/* Row 3 — Heatmap */}
        <div className="mku-card">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-1">Absence Heatmap</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-4">Darker = more absences. Use to identify problem time slots.</p>
          {loading ? <div className="skeleton h-40 w-full" /> : (
            <div className="overflow-x-auto">
              <table className="text-xs" role="grid" aria-label="Absence heatmap by day and hour">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-[var(--text-secondary)]">Hour</th>
                    {DAYS.map(d => <th key={d} className="px-3 py-1 text-center text-[var(--text-secondary)]">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map(hour => (
                    <tr key={hour}>
                      <td className="px-2 py-1 text-[var(--text-secondary)]">{hour}:00</td>
                      {DAYS.map(day => {
                        const v = heatCell(day, hour)
                        const intensity = v / maxAbsences
                        return (
                          <td key={day} className="px-3 py-1 text-center">
                            <div
                              className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold mx-auto"
                              style={{
                                background: `rgba(220,38,38,${0.1 + intensity * 0.8})`,
                                color: intensity > 0.5 ? 'white' : 'var(--text-primary)'
                              }}
                              title={`${day} ${hour}:00 — ${v} absences`}
                              role="cell"
                              aria-label={`${day} ${hour}:00, ${v} absences`}
                            >
                              {v || ''}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Row 4 — At-Risk Students Table */}
        <div className="mku-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">At-Risk Students</h2>
            <button
              onClick={() => window.open('/api/eligibility/report', '_blank')}
              className="btn btn-outline text-xs px-3 py-2 flex items-center gap-1"
            >
              <Download size={13} aria-hidden="true" /> Export Report
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  {['Name','Reg No','Course','Attendance','Trend','Actions'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              {loading ? <TableSkeleton rows={5} cols={6} /> : (
                <tbody>
                  {atRisk.map(s => (
                    <tr key={s.id} className="table-row-hover border-b border-[var(--border-color)] last:border-0">
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{s.name}</td>
                      <td className="py-3 px-3 text-[var(--text-secondary)] font-mono text-xs">{s.reg_no}</td>
                      <td className="py-3 px-3"><span className="badge-expired px-2 py-0.5 rounded text-xs font-mono">{s.course}</span></td>
                      <td className="py-3 px-3">
                        <span className={`font-bold text-sm ${s.pct < 60 ? 'text-red-600' : 'text-amber-600'}`}>{s.pct}%</span>
                      </td>
                      <td className="py-3 px-3"><TrendBadge trend={s.trend} /></td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => sendWarning(s)}
                          disabled={smsSending === s.id}
                          className="btn btn-secondary text-xs px-2 py-1 flex items-center gap-1"
                          aria-label={`Send SMS warning to ${s.name}`}
                        >
                          <MessageSquare size={12} aria-hidden="true" />
                          {smsSending === s.id ? 'Sending…' : 'SMS Warning'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {atRisk.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-[var(--text-secondary)]">No at-risk students — great job! 🎉</td></tr>
                  )}
                </tbody>
              )}
            </table>
          </div>
        </div>

      </div>
    </PageWrapper>
  )
}
