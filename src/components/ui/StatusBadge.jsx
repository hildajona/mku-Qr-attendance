import React from 'react'

const config = {
  present:  { label: 'Present',  cls: 'badge-present' },
  absent:   { label: 'Absent',   cls: 'badge-absent' },
  late:     { label: 'Late',     cls: 'badge-late' },
  active:   { label: 'Active',   cls: 'badge-active' },
  expired:  { label: 'Expired',  cls: 'badge-expired' },
  inactive: { label: 'Inactive', cls: 'badge-expired' },
  pending:  { label: 'Pending',  cls: 'bg-amber-50 text-amber-700' },
}

export default function StatusBadge({ status, className = '' }) {
  const s = status?.toLowerCase()
  const { label, cls } = config[s] || { label: status, cls: 'badge-expired' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls} ${className}`}>
      {label}
    </span>
  )
}
