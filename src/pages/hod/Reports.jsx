import React, { useEffect, useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import api from '../../services/api'
import { FileText, AlertTriangle, Download } from 'lucide-react'

export default function HodReports() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/hod/overview')
      .then(({ data }) => { if (mounted) setOverview(data) })
      .catch((err) => { console.error(err) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return (
    <PageWrapper title="Department Reports">
      <div className="space-y-6">
        <div className="mku-card p-6 rounded-3xl border border-slate-200 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Executive reporting</p>
            <h2 className="text-2xl font-semibold text-slate-900">Attendance intelligence for your department</h2>
          </div>
          <button className="btn btn-primary inline-flex items-center gap-2">
            <Download size={16} /> Export summary
          </button>
        </div>

        <div className="mku-card rounded-3xl border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Low attendance review</h3>
              <p className="text-sm text-slate-500 mt-1">Units with the lowest participation this term.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-600">
              {loading ? '…' : (overview?.low_attendance_units?.length || 0)} flagged
            </span>
          </div>

          <div className="space-y-4">
            {loading ? (
              new Array(3).fill(null).map((_, idx) => (
                <div key={idx} className="animate-pulse rounded-3xl bg-slate-100 h-20" />
              ))
            ) : overview?.low_attendance_units?.length ? (
              overview.low_attendance_units.map((unit) => (
                <div key={unit.id} className="rounded-3xl border border-slate-200 p-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold text-slate-900">{unit.code}</p>
                    <p className="text-sm text-slate-500 mt-1">{unit.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-600">{unit.attendance_percent}%</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{unit.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-slate-200 p-6 text-center text-slate-500">
                No low attendance units detected.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="mku-card p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4 text-slate-500">
              <AlertTriangle size={18} />
              <span>Department risk score</span>
            </div>
            <p className="text-4xl font-bold text-slate-900">{loading ? '…' : `${Math.max(0, 100 - (overview?.stats?.avg_attendance || 75))}%`}</p>
            <p className="text-sm text-slate-500 mt-2">Higher values indicate additional follow-up needed.</p>
          </div>
          <div className="mku-card p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4 text-slate-500">
              <FileText size={18} />
              <span>Report cadence</span>
            </div>
            <p className="text-4xl font-bold text-slate-900">Weekly</p>
            <p className="text-sm text-slate-500 mt-2">Recommended refresh interval for attendance summaries.</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
