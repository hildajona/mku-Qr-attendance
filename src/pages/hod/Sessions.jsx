import React, { useEffect, useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import api from '../../services/api'
import { CalendarCheck, Clock, Users, AlertTriangle } from 'lucide-react'

export default function HodSessions() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    api.get('/hod/overview')
      .then(({ data }) => { if (isMounted) setOverview(data) })
      .catch((err) => { console.error(err) })
      .finally(() => { if (isMounted) setLoading(false) })
    return () => { isMounted = false }
  }, [])

  const sessions = overview?.recent_sessions || []

  return (
    <PageWrapper title="Department Sessions">
      <div className="space-y-6">
        <div className="mku-card p-6 rounded-3xl border border-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Attendance sessions</p>
              <h2 className="text-2xl font-semibold text-slate-900">Review active and recent classroom sessions</h2>
            </div>
            <button className="btn btn-secondary inline-flex items-center gap-2">
              <CalendarCheck size={16} /> New session
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
          <div className="mku-card rounded-3xl border border-slate-200 p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Recent department sessions</h3>
                <p className="text-sm text-slate-500 mt-1">Track attendance performance from the last 6 meetings.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-600">
                {loading ? '…' : sessions.length} sessions
              </span>
            </div>
            <div className="space-y-4">
              {loading ? (
                new Array(4).fill(null).map((_, idx) => (
                  <div key={idx} className="animate-pulse rounded-3xl bg-slate-100 h-24" />
                ))
              ) : sessions.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 p-8 text-center text-slate-500">No recent sessions available.</div>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{session.unit_code}</p>
                        <p className="text-sm text-slate-500">{session.unit_name}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${session.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {session.is_active ? 'Active' : 'Closed'}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-500">
                      <div className="inline-flex items-center gap-2"><Clock size={16} /> {new Date(session.started_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                      <div className="inline-flex items-center gap-2"><Users size={16} /> {session.students_present || 0} present</div>
                    </div>
                    <div className="mt-4 text-sm text-slate-500">
                      Lecturer: {session.lecturer_name || 'Unknown'} • Room: {session.room || 'TBA'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="mku-card rounded-3xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4 text-slate-500">
                <AlertTriangle size={18} />
                <span>Attendance gaps</span>
              </div>
              <p className="text-sm text-slate-700">Highlight units that may require follow-up with lecturers before the exam period.</p>
            </div>
            <div className="mku-card rounded-3xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4 text-slate-500">
                <Clock size={18} />
                <span>Session cadence</span>
              </div>
              <p className="text-sm text-slate-700">Use the HOD dashboard to track session frequency and ensure every unit gets consistent attendance coverage.</p>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
