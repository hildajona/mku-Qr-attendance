import React, { useEffect, useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import api from '../../services/api'
import { Line } from 'react-chartjs-2'
import {
  Building2, Users, BookOpen, CalendarCheck,
  AlertTriangle, TrendingUp, Clock, FileText,
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="mku-card p-5 rounded-3xl border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="text-slate-700 text-sm font-semibold">{label}</div>
        <div className={`p-2 rounded-2xl ${accent}`}> <Icon size={18} /> </div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function HodDashboard() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    api.get('/hod/overview')
      .then(({ data }) => {
        if (isMounted) setOverview(data)
      })
      .catch((err) => {
        console.error('HOD overview load failed', err)
      })
      .finally(() => { if (isMounted) setLoading(false) })
    return () => { isMounted = false }
  }, [])

  const trendData = overview?.trend || {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    present: [74, 78, 81, 79, 84, 80, 82],
    absent: [26, 22, 19, 21, 16, 20, 18],
  }

  const chartData = {
    labels: trendData.labels,
    datasets: [
      {
        label: 'Present %',
        data: trendData.present,
        borderColor: '#0057A8',
        backgroundColor: 'rgba(0,87,168,0.12)',
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
      {
        label: 'Absent %',
        data: trendData.absent,
        borderColor: '#DC2626',
        backgroundColor: 'rgba(220,38,38,0.12)',
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, padding: 15 } },
      tooltip: { cornerRadius: 10, padding: 12 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748B' } },
      y: { beginAtZero: true, max: 100, grid: { color: '#E2E8F0' }, ticks: { color: '#64748B', callback: (value) => `${value}%` } },
    },
  }

  return (
    <PageWrapper title="HOD Dashboard">
      <div className="space-y-6">
        <div className="rounded-3xl p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-800 text-white shadow-lg">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-blue-200">Department overview</p>
              <h1 className="text-3xl font-bold mt-3">{loading ? 'Loading Department...' : overview?.department}</h1>
            </div>
            <div className="rounded-3xl bg-white/10 px-4 py-3 text-sm text-blue-100 border border-white/10">
              <p className="font-semibold">Average attendance</p>
              <p className="text-3xl font-bold mt-2">{loading ? '…' : `${overview?.stats?.avg_attendance || 0}%`}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Courses" value={loading ? '…' : overview?.stats?.courses || 0}
            sub="Active study programmes" accent="bg-sky-100 text-sky-700" icon={BookOpen} />
          <StatCard label="Units" value={loading ? '…' : overview?.stats?.units || 0}
            sub="Total units offered" accent="bg-violet-100 text-violet-700" icon={Building2} />
          <StatCard label="Students" value={loading ? '…' : overview?.stats?.students || 0}
            sub="Department enrolment" accent="bg-emerald-100 text-emerald-700" icon={Users} />
          <StatCard label="Live sessions" value={loading ? '…' : overview?.stats?.active_sessions || 0}
            sub="Currently running" accent="bg-amber-100 text-amber-700" icon={CalendarCheck} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
          <div className="mku-card p-6 rounded-3xl border border-slate-200">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Weekly attendance trend</h2>
                <p className="text-sm text-slate-500 mt-1">Department-wide participation over the last 7 days.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600">
                <TrendingUp size={16} /> Performance view
              </div>
            </div>
            <div className="h-[300px]">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="mku-card p-6 rounded-3xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Most at-risk units</p>
                  <p className="text-xs text-slate-500 mt-1">Units that need immediate follow-up.</p>
                </div>
                <AlertTriangle size={18} className="text-amber-500" />
              </div>
              <div className="space-y-3">
                {(overview?.low_attendance_units || []).map((unit) => (
                  <div key={unit.id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{unit.code}</p>
                        <p className="text-sm text-slate-500">{unit.name}</p>
                      </div>
                      <span className="text-sm font-semibold text-amber-600">{unit.attendance_percent}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${unit.attendance_percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mku-card p-6 rounded-3xl border border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Faculty highlights</h2>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Clock size={18} className="text-slate-400" />
                <span>{loading ? '…' : `${overview?.stats?.faculty || 0} faculty members`} assigned</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 mt-2">
                <FileText size={18} className="text-slate-400" />
                <span>{loading ? '…' : `${overview?.courses?.length || 0} programmes under review`}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="mku-card p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-base font-semibold text-slate-900">Recent sessions</p>
                <p className="text-sm text-slate-500 mt-1">Latest activity from your department.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Live</span>
            </div>
            <div className="space-y-3">
              {(overview?.recent_sessions || []).map((session) => (
                <div key={session.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{session.unit_code}</p>
                      <p className="text-sm text-slate-500">{session.unit_name}</p>
                    </div>
                    <div className={`text-xs font-semibold ${session.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {session.is_active ? 'Active' : 'Closed'}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-500">
                    <div>{session.room}</div>
                    <div>{new Date(session.started_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    <div>{session.lecturer_name}</div>
                    <div>{session.students_present} students present</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mku-card p-6 rounded-3xl border border-slate-200">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Course pipeline</h2>
            <div className="grid gap-3">
              {(overview?.courses || []).slice(0, 4).map((course) => (
                <div key={course.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{course.code}</p>
                      <p className="text-sm text-slate-500">{course.name}</p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>{course.units_count} units</p>
                      <p>{course.students_count} students</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
