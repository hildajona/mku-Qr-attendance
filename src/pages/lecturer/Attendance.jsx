import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper'
import StatusBadge from '../../components/ui/StatusBadge'
import Button from '../../components/ui/Button'
import { useSession } from '../../context/SessionContext'
import { attendanceService } from '../../services/attendance.service'
import { sessionService } from '../../services/session.service'
import { Users, UserX, RefreshCw, StopCircle, Clock, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LecturerAttendance() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const sessionIdParam  = searchParams.get('session')

  const { activeSession, attendees, setAllAttendees, endSession } = useSession()

  const [list, setList]         = useState([])
  const [session, setSession]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const pollRef                 = useRef(null)

  const sessionId = sessionIdParam || activeSession?.id

  const fetchAttendance = async (id) => {
    try {
      const { data } = await attendanceService.getSessionAttendance(id)
      const records = data.records || []
      setList(records)
      setAllAttendees(records)
    } catch {
      // keep existing list
    }
  }

  useEffect(() => {
    if (!sessionId) { setLoading(false); return }

    // Load session details if not in context
    if (activeSession && activeSession.id === parseInt(sessionId)) {
      setSession(activeSession)
    } else {
      sessionService.getSession(sessionId)
        .then(({ data }) => setSession(data.session || data))
        .catch(() => {})
    }

    fetchAttendance(sessionId).finally(() => setLoading(false))

    // Poll every 5 s while session is active
    pollRef.current = setInterval(() => fetchAttendance(sessionId), 5000)
    return () => clearInterval(pollRef.current)
  }, [sessionId])

  // Sync from context attendees when they update (from Session page polling)
  useEffect(() => {
    if (attendees.length > 0 && list.length === 0) setList(attendees)
  }, [attendees])

  const currentSession = session || activeSession

  const handleMarkAbsent = async (record) => {
    try {
      await attendanceService.markAbsent(sessionId, record.student_id)
      toast.success(`${record.student_name} marked absent`)
      fetchAttendance(sessionId)
    } catch {
      toast.error('Failed to mark absent')
    }
  }

  const handleEndSession = async () => {
    try {
      await sessionService.endSession(sessionId)
      endSession()
      clearInterval(pollRef.current)
      toast.success('Session ended')
      navigate('/lecturer')
    } catch {
      toast.error('Failed to end session')
    }
  }

  const presentCount = list.filter(r => r.status === 'present').length
  const lateCount    = list.filter(r => r.status === 'late').length
  const absentCount  = list.filter(r => r.status === 'absent').length

  return (
    <PageWrapper title="Attendance List">
      <div className="space-y-5 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => navigate('/lecturer')} className="text-slate-400 hover:text-slate-600">
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-xl font-bold text-slate-800">
                {currentSession?.unit_name || 'Attendance List'}
              </h1>
              {currentSession?.is_active && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {currentSession?.room && `Room: ${currentSession.room} · `}
              {currentSession?.started_at && `Started: ${new Date(currentSession.started_at).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })} · ${new Date(currentSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />}
              onClick={() => fetchAttendance(sessionId)}>
              Refresh
            </Button>
            {currentSession?.is_active && (
              <Button variant="danger" size="sm" leftIcon={<StopCircle size={14} />}
                onClick={handleEndSession}>
                End Session
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{presentCount}</p>
            <p className="text-xs text-green-600 font-semibold mt-1">Present</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-amber-700">{lateCount}</p>
            <p className="text-xs text-amber-600 font-semibold mt-1">Late</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-red-700">{absentCount}</p>
            <p className="text-xs text-red-600 font-semibold mt-1">Absent</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              <span className="font-semibold text-slate-700">{list.length} students</span>
            </div>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex-shrink-0" />
                  <div className="flex-1 h-4 bg-slate-100 rounded" />
                  <div className="w-20 h-4 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No students have scanned yet</p>
              <p className="text-slate-300 text-sm mt-1">Waiting for students to scan the QR code…</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reg No.</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r, i) => (
                    <tr key={r.id || i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-slate-700">{r.student_name}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{r.reg_number}</td>
                      <td className="px-5 py-3 text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {r.scanned_at
                            ? new Date(r.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </div>
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-3">
                        {r.status !== 'absent' && currentSession?.is_active && (
                          <button
                            onClick={() => handleMarkAbsent(r)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                          >
                            <UserX size={12} /> Mark Absent
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
