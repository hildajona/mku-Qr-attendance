import React, { useMemo } from 'react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getDayColor(status) {
  if (!status) return 'bg-slate-100'
  if (status === 'present') return 'bg-green-500'
  if (status === 'late')    return 'bg-amber-400'
  if (status === 'absent')  return 'bg-red-400'
  return 'bg-slate-100'
}

export default function CalendarHeatmap({ records = [], month, year }) {
  const now = new Date()
  const m   = month ?? now.getMonth()
  const y   = year  ?? now.getFullYear()

  const statusMap = useMemo(() => {
    const map = {}
    records.forEach(r => {
      const d = new Date(r.date || r.scanned_at)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      map[key] = r.status
    })
    return map
  }, [records])

  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()

  const cells = []
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d)
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">
          {MONTHS[m]} {y}
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Present</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Late</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Absent</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-100 inline-block" /> No class</span>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />
          const key = `${y}-${m}-${day}`
          const status = statusMap[key]
          const isToday = day === now.getDate() && m === now.getMonth() && y === now.getFullYear()
          return (
            <div
              key={key}
              title={status ? `${day} ${MONTHS[m]}: ${status}` : `${day} ${MONTHS[m]}`}
              className={`
                aspect-square rounded-md flex items-center justify-center text-xs font-medium
                transition-transform hover:scale-110 cursor-default
                ${getDayColor(status)}
                ${status ? 'text-white' : 'text-slate-400'}
                ${isToday ? 'ring-2 ring-offset-1 ring-slate-400' : ''}
              `}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}
