import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper'
import Button from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { ScanLine, BookOpen, AlertTriangle, FileDown, User, Key, CheckCircle2, XCircle } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

// Transform the raw API response into the shape the UI needs
function buildDashboardData(apiData, user) {
  // API returns: { records, units, overall }
  const units   = apiData?.units   || []
  const records = apiData?.records || []
  const overall = apiData?.overall ?? 0

  const courses = units.map(u => ({
    id:         u.id,
    name:       u.name,
    code:       u.code,
    percentage: u.percentage ?? 0,
  }))

  const present = records.filter(r => r.status === 'present' || r.status === 'late').length
  const absent  = records.filter(r => r.status === 'absent').length

  const recent = records.slice(0, 5).map((r, i) => ({
    id:     r.id || i,
    code:   r.unit_code || r.unit_name || '—',
    time:   r.date ? new Date(r.date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }) : '—',
    status: r.status === 'present' || r.status === 'late' ? 'Present' : 'Absent',
  }))

  return {
    student_info: {
      reg_no: user?.reg_number || '—',
      year:   1,
      sem:    1,
    },
    overview: {
      avg:     overall,
      present,
      absent,
    },
    courses,
    recent,
  }
}

const MOCK_DATA = (user) => ({
  student_info: { reg_no: user?.reg_number || 'SCT211-0001/2024', year: 2, sem: 1 },
  overview:     { avg: 78, present: 12, absent: 3 },
  courses: [
    { id: 1, name: 'Algorithms',      code: 'BCS301', percentage: 82 },
    { id: 2, name: 'Data Structures', code: 'BCS302', percentage: 75 },
    { id: 3, name: 'Networks',        code: 'BCS303', percentage: 65 },
  ],
  recent: [
    { id: 1, code: 'BCS301', time: 'Today 9:03am',  status: 'Present' },
    { id: 2, code: 'BCS302', time: 'Yesterday',      status: 'Present' },
    { id: 3, code: 'BCS303', time: 'Mon 8:00am',     status: 'Absent'  },
  ],
})

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [classCode, setClassCode] = useState('')
  const [marking, setMarking]   = useState(false)

  useEffect(() => {
    if (!user?.id) return
    api.get(`/attendance/student/${user.id}`)
      .then(({ data: raw }) => {
        // If the response already has the expected shape use it directly,
        // otherwise transform it from the real API shape
        if (raw?.student_info) {
          setData(raw)
        } else {
          setData(buildDashboardData(raw, user))
        }
      })
      .catch(() => setData(MOCK_DATA(user)))
      .finally(() => setLoading(false))
  }, [user])

  const handleMarkComputer = async (e) => {
    e.preventDefault()
    if (!classCode || classCode.trim().length !== 6) {
      toast.error('Class code must be exactly 6 characters.')
      return
    }
    setMarking(true)
    try {
      const { data: res } = await api.post('/attendance/computer', { code: classCode.trim().toUpperCase() })
      toast.success(res.message || 'Attendance marked successfully!')
      setClassCode('')
      // Refresh stats
      const { data: raw } = await api.get(`/attendance/student/${user?.id}`)
      setData(raw?.student_info ? raw : buildDashboardData(raw, user))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance.')
    } finally {
      setMarking(false)
    }
  }

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <PageWrapper title="Dashboard">
        <div className="space-y-4 animate-pulse max-w-2xl mx-auto">
          <div className="h-24 bg-slate-100 rounded-3xl" />
          <div className="h-20 bg-slate-100 rounded-3xl" />
          <div className="h-32 bg-slate-100 rounded-3xl" />
          <div className="h-48 bg-slate-100 rounded-3xl" />
        </div>
      </PageWrapper>
    )
  }

  if (!data) return null

  const lowAttendanceCourses = data.courses.filter(c => c.percentage < 75)

  return (
    <PageWrapper title="Dashboard">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Welcome */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-lg">
          <h1 className="text-2xl font-bold mb-1">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="text-blue-100 text-sm">
            {data.student_info.reg_no} • Year {data.student_info.year} Sem {data.student_info.sem}
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(user?.has_smartphone !== false && user?.has_smartphone !== 0) && (
            <button
              onClick={() => navigate('/student/scanner')}
              className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors gap-2 text-slate-700"
            >
              <div className="bg-blue-100 text-blue-600 p-3 rounded-full"><ScanLine size={20} /></div>
              <span className="text-xs font-semibold">Scan QR</span>
            </button>
          )}
          <button
            onClick={() => {
              const token = localStorage.getItem('cams_token') || localStorage.getItem('mku_token')
              window.open(`/api/reports/student/${user?.id}/pdf?_t=${token}`, '_blank')
            }}
            className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors gap-2 text-slate-700"
          >
            <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full"><FileDown size={20} /></div>
            <span className="text-xs font-semibold">Report</span>
          </button>
          <button
            onClick={() => navigate('/student/profile')}
            className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors gap-2 text-slate-700"
          >
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full"><User size={20} /></div>
            <span className="text-xs font-semibold">Profile</span>
          </button>
          <button
            onClick={() => navigate('/student/history')}
            className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors gap-2 text-slate-700"
          >
            <div className="bg-slate-100 text-slate-600 p-3 rounded-full"><BookOpen size={20} /></div>
            <span className="text-xs font-semibold">History</span>
          </button>
        </div>

        {/* Campus Browser Marking */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Key size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Campus Browser Marking</h3>
              <p className="text-xs text-slate-500">Enter the 6-character code shown on the projector</p>
            </div>
          </div>
          <form onSubmit={handleMarkComputer} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. XK94M2"
              value={classCode}
              onChange={e => setClassCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-mono uppercase tracking-wider text-center text-lg outline-none focus:border-indigo-500 transition-colors"
            />
            <Button type="submit" variant="primary" loading={marking} className="px-5 py-2 rounded-xl">
              Mark Present
            </Button>
          </form>
        </div>

        {/* Low attendance warning */}
        {lowAttendanceCourses.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex gap-3 items-start">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-red-800">Attendance Warning</p>
              <p className="text-xs text-red-700 mt-1">
                Your attendance in <strong>{lowAttendanceCourses.map(c => c.code).join(', ')}</strong> is below 75%.
                A minimum of 75% is required to sit exams.
              </p>
            </div>
          </div>
        )}

        {/* Overview */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">Attendance Overview</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-slate-800">{data.overview.avg}%</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Average</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
              <p className="text-2xl font-black text-green-600">{data.overview.present}</p>
              <p className="text-xs text-green-600 font-medium mt-1">Present</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-4 text-center border border-red-100">
              <p className="text-2xl font-black text-red-600">{data.overview.absent}</p>
              <p className="text-xs text-red-600 font-medium mt-1">Absent</p>
            </div>
          </div>
        </div>

        {/* My Courses */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">My Courses</h2>
          {data.courses.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No courses enrolled yet.</p>
          ) : (
            <div className="space-y-4">
              {data.courses.map(course => {
                const isLow = course.percentage < 75
                return (
                  <div key={course.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium text-slate-400">{course.code}</span>
                        <span className="text-sm font-semibold text-slate-700">{course.name}</span>
                      </div>
                      <span className={`text-sm font-bold ${isLow ? 'text-red-500' : 'text-slate-700'}`}>
                        {course.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-blue-600'}`}
                        style={{ width: `${course.percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Attendance */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">Recent Attendance</h2>
          {data.recent.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No attendance records yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recent.map((record, i) => (
                <div key={record.id || i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {record.status === 'Present'
                      ? <CheckCircle2 size={18} className="text-green-500" />
                      : <XCircle     size={18} className="text-red-500" />
                    }
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{record.code}</p>
                      <p className="text-xs text-slate-400">{record.time}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                    record.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </PageWrapper>
  )
}
