import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import MetricCard from '../../components/ui/MetricCard'
import StatusBadge from '../../components/ui/StatusBadge'
import AttendanceChart from '../../components/charts/AttendanceChart'
import { Users, GraduationCap, CalendarCheck, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import api from '../../services/api'

export default function AdminDashboard() {
  const [stats, setStats]     = useState(null)
  const [sessions, setSessions] = useState([])
  const [alerts, setAlerts]   = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, sessionsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/recent-sessions'),
        ])
        setStats(statsRes.data)
        setSessions(sessionsRes.data.sessions || [])
        setAlerts(sessionsRes.data.alerts || [])
        setChartData(sessionsRes.data.chart || [])
      } catch {
        // Use mock data if backend not connected
        setStats({ students: 1240, lecturers: 48, sessions_today: 12, avg_attendance: 78 })
        setSessions([
          { id: 1, unit_name: 'Data Structures', course_name: 'BSc CS', room: 'LH-3', started_at: new Date().toISOString(), is_active: true, attendance_count: 34 },
          { id: 2, unit_name: 'Calculus II', course_name: 'BSc Math', room: 'LH-1', started_at: new Date(Date.now() - 3600000).toISOString(), is_active: false, attendance_count: 28 },
          { id: 3, unit_name: 'Database Systems', course_name: 'BSc IT', room: 'Lab-2', started_at: new Date(Date.now() - 7200000).toISOString(), is_active: false, attendance_count: 41 },
        ])
        setAlerts([
          { unit: 'Operating Systems', avg: 42, course: 'BSc CS' },
          { unit: 'Linear Algebra', avg: 38, course: 'BSc Math' },
        ])
        setChartData([
          { unit_name: 'Data Structures', present: 34, absent: 6 },
          { unit_name: 'Calculus II', present: 28, absent: 12 },
          { unit_name: 'Database Systems', present: 41, absent: 4 },
          { unit_name: 'Networks', present: 22, absent: 18 },
          { unit_name: 'OS', present: 19, absent: 21 },
        ])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <PageWrapper title="Admin Dashboard">
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Students"
            value={loading ? '...' : stats?.students?.toLocaleString()}
            icon={Users}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
            trend={3}
            trendLabel="+3% this month"
          />
          <MetricCard
            label="Lecturers"
            value={loading ? '...' : stats?.lecturers}
            icon={GraduationCap}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
          />
          <MetricCard
            label="Sessions Today"
            value={loading ? '...' : stats?.sessions_today}
            icon={CalendarCheck}
            iconColor="text-green-600"
            iconBg="bg-green-50"
            trend={2}
            trendLabel="+2 vs yesterday"
          />
          <MetricCard
            label="Avg Attendance"
            value={loading ? '...' : `${stats?.avg_attendance}%`}
            icon={TrendingUp}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
            trend={-1}
            trendLabel="-1% this week"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">Attendance by Unit (Today)</h2>
            <AttendanceChart data={chartData} title="" />
          </div>

          {/* Low attendance alerts */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="font-semibold text-slate-800">Low Attendance Alerts</h2>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-400">No alerts — all units above threshold.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{a.unit}</p>
                      <p className="text-xs text-slate-400">{a.course}</p>
                    </div>
                    <span className="text-sm font-bold text-amber-600">{a.avg}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent sessions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Recent Sessions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Unit</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Course</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Room</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Scanned</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 bg-slate-100 rounded animate-pulse w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sessions.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 table-row-hover">
                    <td className="px-5 py-3 font-medium text-slate-700">{s.unit_name}</td>
                    <td className="px-5 py-3 text-slate-500">{s.course_name}</td>
                    <td className="px-5 py-3 text-slate-500">{s.room || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock size={13} className="text-slate-400" />
                        {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-700 font-medium">{s.attendance_count}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={s.is_active ? 'active' : 'expired'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
