import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper'
import {
  Users, GraduationCap, CalendarCheck, TrendingUp, Building2,
  BookOpen, Activity, UserPlus, QrCode, ArrowRight, AlertTriangle, Database
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import api from '../../services/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const BAR_DATA = {
  labels: ['SCIT', 'SBUS', 'SENG', 'SHS', 'SEDU', 'SLAW'],
  datasets: [{
    label: 'Attendance Rate %',
    data: [84, 76, 71, 89, 65, 78],
    backgroundColor: 'rgba(0, 87, 168, 0.85)',
    borderRadius: 6,
    borderSkipped: false,
  }],
}

const BAR_OPTS = {
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
}

const LINE_DATA = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    { label: 'Present', data: [820, 740, 910, 680, 950, 200, 0],
      borderColor: '#0057A8', backgroundColor: 'rgba(0,87,168,0.08)',
      borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#0057A8', fill: true, tension: 0.3 },
    { label: 'Absent', data: [180, 260, 90, 320, 50, 10, 0],
      borderColor: '#DC2626', backgroundColor: 'transparent',
      borderWidth: 2, borderDash: [5, 3], pointRadius: 3, fill: false, tension: 0.3 },
  ],
}

const LINE_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { usePointStyle: true, font: { size: 12 } } },
    tooltip: { backgroundColor: '#0F172A', cornerRadius: 8, padding: 10 },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 11 } } },
    y: { beginAtZero: true, grid: { color: '#F1F5F9' }, ticks: { color: '#64748B', font: { size: 11 } } },
  },
}

const FEED = [
  { id: 1, msg: 'Alice Wanjiku checked in to Data Structures',      time: '2 min ago',  Icon: CalendarCheck, clr: '#059669', bg: '#D1FAE5' },
  { id: 2, msg: 'Dr. Mwangi started a session for SCT211',          time: '8 min ago',  Icon: QrCode,        clr: '#0057A8', bg: '#E8F1FB' },
  { id: 3, msg: '47 students checked in to Database Systems',       time: '15 min ago', Icon: Users,         clr: '#7C3AED', bg: '#EDE9FE' },
  { id: 4, msg: 'Prof. Kamau started a session for SCT222',         time: '22 min ago', Icon: QrCode,        clr: '#0057A8', bg: '#E8F1FB' },
  { id: 5, msg: 'New lecturer Dr. Odhiambo added to SBUS',          time: '1 hr ago',   Icon: UserPlus,      clr: '#D97706', bg: '#FEF3C7' },
  { id: 6, msg: 'Low attendance alert: OS Fundamentals — 42%',      time: '2 hrs ago',  Icon: AlertTriangle, clr: '#DC2626', bg: '#FEE2E2' },
  { id: 7, msg: 'Session closed — Engineering Drawing (78 scanned)',time: '3 hrs ago',  Icon: CalendarCheck, clr: '#475569', bg: '#F1F5F9' },
]

function StatCard({ label, value, sub, Icon, iconColor, iconBg, trend, loading }) {
  return (
    <div className="mku-card flex items-start gap-4 fade-in">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        <Icon size={22} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        {loading ? (
          <><div className="skeleton h-7 w-20 rounded mb-1" /><div className="skeleton h-3.5 w-28 rounded" /></>
        ) : (
          <>
            <p className="text-2xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
            {sub && (
              <p className={`text-xs mt-0.5 font-semibold ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : ''}`}>
                {trend > 0 ? '↑' : trend < 0 ? '↓' : ''} {sub}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats').catch(() => null),
      api.get('/health').catch(() => null),
    ]).then(([sRes, hRes]) => {
      setStats(sRes?.data || { departments: 6, lecturers: 101, students: 10248, sessions_today: 14, avg_attendance: 79, active_sessions: 2 })
      setHealth(hRes?.data)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-6">

        {/* System health bar */}
        {health && (
          <div className="rounded-2xl px-5 py-3 flex items-center gap-4 flex-wrap text-xs" style={{ background: 'var(--bg-sidebar)' }}>
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              <Activity size={14} /> CAMS v{health.version || '2.0.0'}
            </div>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Database size={12} /> {health.database}
            </div>
            <div className="ml-auto" style={{ color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Departments" value={loading ? '…' : stats?.departments}
            Icon={Building2} iconColor="#0057A8" iconBg="#E8F1FB" loading={loading} />
          <StatCard label="Total Lecturers" value={loading ? '…' : stats?.lecturers?.toLocaleString()}
            sub="+3 this month" trend={1} Icon={GraduationCap} iconColor="#7C3AED" iconBg="#EDE9FE" loading={loading} />
          <StatCard label="Total Students" value={loading ? '…' : stats?.students?.toLocaleString()}
            sub="+128 this month" trend={1} Icon={Users} iconColor="#059669" iconBg="#D1FAE5" loading={loading} />
          <StatCard label="Today's Sessions" value={loading ? '…' : stats?.sessions_today}
            sub={`${stats?.active_sessions || 0} active now`} trend={stats?.active_sessions > 0 ? 1 : 0}
            Icon={CalendarCheck} iconColor="#D97706" iconBg="#FEF3C7" loading={loading} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Bar chart — dept attendance */}
          <div className="lg:col-span-3 mku-card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Attendance Rate by Department</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>This week · all units</p>
              </div>
              <button onClick={() => navigate('/admin/reports')}
                className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--mku-blue-accent)' }}>
                Full report <ArrowRight size={12} />
              </button>
            </div>
            {loading ? <div className="skeleton h-52 rounded-xl" /> : (
              <div style={{ height: 210 }}>
                <Bar data={BAR_DATA} options={BAR_OPTS} />
              </div>
            )}
          </div>

          {/* Side stats */}
          <div className="lg:col-span-2 space-y-4">
            {/* Avg attendance ring */}
            <div className="mku-card text-center">
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>
                Weekly Avg Attendance
              </p>
              <div className="relative w-28 h-28 mx-auto">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-color)" strokeWidth="10" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#0057A8" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 40 * (loading ? 0 : (stats?.avg_attendance || 79)) / 100} ${2 * Math.PI * 40}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {loading ? '…' : `${stats?.avg_attendance || 79}%`}
                  </span>
                </div>
              </div>
              <p className="text-xs mt-2 text-green-600 font-semibold">↑ +2% vs last week</p>
            </div>

            {/* Low attendance alerts */}
            <div className="mku-card">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} className="text-amber-500" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Low Attendance Alerts</h3>
              </div>
              <div className="space-y-2">
                {[
                  { unit: 'OS Fundamentals', dept: 'SCIT', rate: 42 },
                  { unit: 'Linear Algebra', dept: 'SENG', rate: 38 },
                  { unit: 'Business Stats', dept: 'SBUS', rate: 51 },
                ].map(a => (
                  <div key={a.unit} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: '#FEF3C7' }}>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#92400E' }}>{a.unit}</p>
                      <p className="text-xs" style={{ color: '#B45309' }}>{a.dept}</p>
                    </div>
                    <span className="text-base font-bold" style={{ color: '#D97706' }}>{a.rate}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Weekly trend line chart */}
        <div className="mku-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Weekly Attendance Trend</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Students present vs absent across all departments</p>
            </div>
          </div>
          {loading ? <div className="skeleton h-44 rounded-xl" /> : (
            <div style={{ height: 175 }}>
              <Line data={LINE_DATA} options={LINE_OPTS} />
            </div>
          )}
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity feed */}
          <div className="mku-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Recent Activity</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--mku-blue-light)', color: 'var(--mku-blue)' }}>Live</span>
            </div>
            <div className="space-y-1">
              {FEED.map(({ id, msg, time, Icon, clr, bg }) => (
                <div key={id} className="flex items-start gap-3 px-2 py-2.5 rounded-xl table-row-hover">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                    <Icon size={14} style={{ color: clr }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{msg}</p>
                  </div>
                  <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--text-secondary)' }}>{time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="mku-card">
            <h2 className="font-bold text-base mb-4" style={{ color: 'var(--text-primary)' }}>Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Add Department', Icon: Building2, path: '/admin/departments', clr: '#0057A8', bg: '#E8F1FB' },
                { label: 'Add Lecturer',   Icon: GraduationCap, path: '/admin/lecturers', clr: '#7C3AED', bg: '#EDE9FE' },
                { label: 'Add Unit',       Icon: BookOpen, path: '/admin/units', clr: '#059669', bg: '#D1FAE5' },
                { label: 'Add Student',    Icon: UserPlus, path: '/admin/students', clr: '#D97706', bg: '#FEF3C7' },
                { label: 'View Sessions',  Icon: CalendarCheck, path: '/admin/sessions', clr: '#DC2626', bg: '#FEE2E2' },
                { label: 'Reports',        Icon: TrendingUp, path: '/admin/reports', clr: '#0891B2', bg: '#E0F7FA' },
              ].map(({ label, Icon, path, clr, bg }) => (
                <button key={label} onClick={() => navigate(path)}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-md"
                  style={{ background: bg, border: `1px solid ${clr}22` }}>
                  <Icon size={18} style={{ color: clr }} />
                  <span className="text-sm font-semibold" style={{ color: clr }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
