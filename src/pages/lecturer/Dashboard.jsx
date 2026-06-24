import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper'
import Button from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import {
  PlayCircle, Users, BookOpen, Clock, AlertTriangle,
  CalendarCheck, FileDown, CheckCircle2, XCircle, TrendingUp
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function LecturerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [courses,  setCourses]  = useState([])
  const [sessions, setSessions] = useState([])
  const [appeals,  setAppeals]  = useState([])
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [submittingAppealId, setSubmittingAppealId] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        const [cRes, sRes, aRes] = await Promise.allSettled([
          api.get('/courses/lecturer'),
          api.get('/sessions/lecturer/today'),
          api.get('/appeals/lecturer'),
        ])
        setCourses(cRes.value?.data?.courses   || cRes.value?.data || [])
        setSessions(sRes.value?.data?.sessions || sRes.value?.data || [])
        setAppeals(aRes.value?.data?.appeals   || aRes.value?.data || [])

        // Compute quick stats from courses
        const c = cRes.value?.data?.courses || cRes.value?.data || []
        setStats({
          totalCourses:  c.length,
          totalStudents: c.reduce((a, x) => a + (x.student_count || x.students || 0), 0),
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const handleResolveAppeal = async (appealId, status) => {
    const review_note = window.prompt(
      `Enter review note for ${status}:`,
      `Verified. Appeal ${status}.`
    )
    if (review_note === null) return
    setSubmittingAppealId(appealId)
    try {
      await api.post(`/appeals/${appealId}/respond`, { status, review_note })
      toast.success(`Appeal ${status} successfully`)
      setAppeals(prev => prev.filter(a => a.id !== appealId))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond to appeal')
    } finally {
      setSubmittingAppealId(null)
    }
  }

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const camsToken = () => localStorage.getItem('cams_token') || localStorage.getItem('mku_token') || ''

  if (loading) {
    return (
      <PageWrapper title="Dashboard">
        <div className="space-y-4 animate-pulse max-w-3xl mx-auto">
          <div className="h-28 rounded-3xl" style={{ background: '#E8F1FB' }} />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 rounded-2xl" style={{ background: '#E8F1FB' }} />
            <div className="h-20 rounded-2xl" style={{ background: '#E8F1FB' }} />
          </div>
          <div className="h-48 rounded-3xl" style={{ background: '#E8F1FB' }} />
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="Dashboard">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Welcome banner ── */}
        <div className="rounded-3xl p-6 text-white shadow-lg flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #003D7A 0%, #0057A8 60%, #1976D2 100%)' }}>
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Lecturer'} 👋
            </h1>
            <p className="text-sm flex items-center gap-2 opacity-80">
              <BookOpen size={15} />
              {user?.department || 'Mount Kenya University'}
            </p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: 'rgba(255,193,7,0.2)', border: '1px solid rgba(255,193,7,0.4)' }}>
            <CalendarCheck size={32} style={{ color: '#FFC107' }} />
          </div>
        </div>

        {/* ── Quick stats ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'My Courses',    value: stats.totalCourses,  icon: BookOpen,    color: '#0057A8' },
              { label: 'Total Students',value: stats.totalStudents, icon: Users,       color: '#1976D2' },
              { label: 'Today Sessions',value: sessions.length,     icon: TrendingUp,  color: '#FFC107', textDark: true },
            ].map(({ label, value, icon: Icon, color, textDark }) => (
              <div key={label} className="bg-white rounded-2xl p-4 border flex items-center gap-3"
                style={{ borderColor: '#E5E7EB' }}>
                <div className="p-2 rounded-xl flex-shrink-0"
                  style={{ background: color + '18' }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div>
                  <p className="text-2xl font-black" style={{ color: textDark ? color : '#111827' }}>{value}</p>
                  <p className="text-xs font-medium" style={{ color: '#6B7280' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Today's Sessions ── */}
        <div className="bg-white rounded-3xl border p-6 shadow-sm" style={{ borderColor: '#E5E7EB' }}>
          <h2 className="text-xs font-bold tracking-wider uppercase mb-4"
            style={{ color: '#9CA3AF' }}>Today's Sessions</h2>
          {sessions.length === 0 ? (
            <div className="text-center py-6">
              <CalendarCheck size={36} style={{ color: '#D1D5DB' }} className="mx-auto mb-2" />
              <p className="text-sm" style={{ color: '#9CA3AF' }}>No sessions scheduled for today.</p>
              <Button variant="primary" className="mt-4" onClick={() => navigate('/lecturer/session')}>
                Start a New Session
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map(session => (
                <div key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl gap-4"
                  style={{ background: '#f8faff', border: '1px solid #E8F1FB' }}>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: '#111827' }}>
                      {session.unit_code || session.code}
                    </h3>
                    <div className="flex items-center gap-3 text-sm mt-1" style={{ color: '#6B7280' }}>
                      {session.room && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border"
                          style={{ borderColor: '#E5E7EB' }}>
                          <Users size={13} style={{ color: '#9CA3AF' }} /> {session.room}
                        </span>
                      )}
                      {(session.start_time || session.started_at) && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border"
                          style={{ borderColor: '#E5E7EB' }}>
                          <Clock size={13} style={{ color: '#9CA3AF' }} />
                          {session.start_time || new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    leftIcon={<PlayCircle size={18} />}
                    className="w-full sm:w-auto whitespace-nowrap"
                    onClick={() => navigate('/lecturer/session')}
                  >
                    Open Session
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── My Courses ── */}
        {courses.length > 0 && (
          <div className="bg-white rounded-3xl border p-6 shadow-sm" style={{ borderColor: '#E5E7EB' }}>
            <h2 className="text-xs font-bold tracking-wider uppercase mb-4" style={{ color: '#9CA3AF' }}>
              My Courses
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.map(course => (
                <div key={course.id}
                  className="p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:shadow-md"
                  style={{ border: '1px solid #E8F1FB', background: '#f8faff' }}
                  onClick={() => navigate('/lecturer/courses')}>
                  <div>
                    <span className="text-xs font-mono font-semibold px-2 py-1 rounded-md"
                      style={{ background: '#E8F1FB', color: '#0057A8' }}>
                      {course.code || course.unit_code}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="font-semibold text-sm" style={{ color: '#374151' }}>
                        {course.name || course.unit_name}
                      </p>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          window.open(`/api/reports/lecturer/${course.id}/excel?_t=${camsToken()}`, '_blank')
                        }}
                        className="p-1 rounded transition-colors hover:bg-blue-100"
                        style={{ color: '#0057A8' }}
                        title="Download Excel Report"
                      >
                        <FileDown size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: '#111827' }}>
                      {course.student_count || course.students || 0}
                    </p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>students</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Pending Appeals ── */}
        {appeals.length > 0 && (
          <div className="bg-white rounded-3xl border p-6 shadow-sm" style={{ borderColor: '#E5E7EB' }}>
            <h2 className="text-xs font-bold tracking-wider uppercase mb-4 flex items-center gap-1.5"
              style={{ color: '#9CA3AF' }}>
              <AlertTriangle size={15} style={{ color: '#D97706' }} />
              Pending Appeals ({appeals.length})
            </h2>
            <div className="space-y-4">
              {appeals.map(appeal => (
                <div key={appeal.id} className="p-4 rounded-2xl space-y-3"
                  style={{ border: '1px solid #FEF3C7', background: '#FFFBEB' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold" style={{ color: '#111827' }}>{appeal.student_name}</p>
                      <p className="text-xs font-mono" style={{ color: '#9CA3AF' }}>{appeal.reg_number}</p>
                    </div>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: '#E8F1FB', color: '#0057A8' }}>
                      {appeal.unit_code}
                    </span>
                  </div>
                  <div className="text-sm p-3 rounded-xl"
                    style={{ background: 'white', border: '1px solid #FDE68A' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#9CA3AF' }}>Reason:</p>
                    <p className="italic" style={{ color: '#374151' }}>"{appeal.reason}"</p>
                    {appeal.evidence_url && (
                      <a href={appeal.evidence_url} target="_blank" rel="noopener noreferrer"
                        className="mt-2 block text-xs font-medium hover:underline" style={{ color: '#0057A8' }}>
                        View Supporting Document →
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" leftIcon={<CheckCircle2 size={13} />}
                      onClick={() => handleResolveAppeal(appeal.id, 'approved')}
                      disabled={submittingAppealId === appeal.id}
                      className="flex-1">
                      Approve
                    </Button>
                    <Button variant="danger" size="sm" leftIcon={<XCircle size={13} />}
                      onClick={() => handleResolveAppeal(appeal.id, 'rejected')}
                      disabled={submittingAppealId === appeal.id}
                      className="flex-1">
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </PageWrapper>
  )
}
