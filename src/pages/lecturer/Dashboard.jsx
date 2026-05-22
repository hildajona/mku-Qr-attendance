import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper'
import MetricCard from '../../components/ui/MetricCard'
import SessionCard from '../../components/ui/SessionCard'
import Button from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { CalendarCheck, Users, TrendingUp, Clock, Plus } from 'lucide-react'
import api from '../../services/api'

export default function LecturerDashboard() {
  const { user }      = useAuth()
  const navigate      = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/sessions/lecturer')
      .then(({ data }) => setData(data))
      .catch(() => {
        setData({
          stats: { sessions_today: 2, total_students: 145, avg_attendance: 82 },
          today_sessions: [
            { id: 1, unit_name: 'Data Structures', course_name: 'BSc CS', room: 'LH-3', started_at: new Date().toISOString(), is_active: true, attendance_count: 34 },
            { id: 2, unit_name: 'Database Systems', course_name: 'BSc CS', room: 'Lab-2', started_at: new Date(Date.now() - 3600000).toISOString(), is_active: false, attendance_count: 28 },
          ],
          recent: [
            { id: 3, unit_name: 'Data Structures', course_name: 'BSc CS', room: 'LH-3', started_at: new Date(Date.now() - 86400000).toISOString(), is_active: false, attendance_count: 36 },
          ]
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-6">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => navigate('/lecturer/session')}>
            Start Session
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Sessions Today" value={loading ? '...' : data?.stats?.sessions_today} icon={CalendarCheck} iconColor="text-green-600" iconBg="bg-green-50" />
          <MetricCard label="Total Students" value={loading ? '...' : data?.stats?.total_students} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <MetricCard label="Avg Attendance" value={loading ? '...' : `${data?.stats?.avg_attendance}%`} icon={TrendingUp} iconColor="text-purple-600" iconBg="bg-purple-50" />
        </div>

        {/* Today's sessions */}
        <div>
          <h2 className="font-semibold text-slate-800 mb-3">Today's Sessions</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1,2].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-32 animate-pulse" />)}
            </div>
          ) : data?.today_sessions?.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <Clock size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No sessions today yet.</p>
              <Button variant="primary" size="sm" className="mt-3" onClick={() => navigate('/lecturer/session')}>
                Start First Session
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data?.today_sessions?.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onClick={() => navigate(`/lecturer/attendance?session=${s.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent sessions */}
        {data?.recent?.length > 0 && (
          <div>
            <h2 className="font-semibold text-slate-800 mb-3">Recent Sessions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.recent.map(s => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
