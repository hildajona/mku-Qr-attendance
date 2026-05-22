import React from 'react'
import { Clock, Users, MapPin, BookOpen } from 'lucide-react'
import StatusBadge from './StatusBadge'

export default function SessionCard({ session, onClick, actions }) {
  const startDate = session.started_at ? new Date(session.started_at) : null
  const startTime = startDate
    ? `${startDate.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })} · ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : '—'

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800 text-base">{session.unit_name || session.unit?.name}</h3>
          <p className="text-sm text-slate-500">{session.course_name || session.course?.name}</p>
        </div>
        <StatusBadge status={session.is_active ? 'active' : 'expired'} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-slate-400" />
          <span>{startTime}</span>
        </div>
        {session.room && (
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-slate-400" />
            <span>{session.room}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-slate-400" />
          <span>{session.attendance_count ?? 0} scanned</span>
        </div>
        {session.unit_code && (
          <div className="flex items-center gap-1.5">
            <BookOpen size={13} className="text-slate-400" />
            <span>{session.unit_code}</span>
          </div>
        )}
      </div>
      {actions && (
        <div className="mt-4 flex gap-2" onClick={e => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  )
}
