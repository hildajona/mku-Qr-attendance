import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import StatusBadge from '../../components/ui/StatusBadge'
import { attendanceService } from '../../services/attendance.service'
import { Filter, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const PAGE_SIZE = 50

export default function LecturerExport() {
  const [units, setUnits]         = useState([])
  const [filters, setFilters]     = useState({ unit_id: '', date_from: '', date_to: '' })
  const [data, setData]           = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    api.get('/lecturer/courses')
      .then(({ data }) => {
        const all = []
        ;(data.courses || []).forEach(c => (c.units || []).forEach(u => all.push({ ...u, course_name: c.name })))
        setUnits(all)
      })
      .catch(() => setUnits([
        { id: 1, name: 'Data Structures & Algorithms', code: 'SCS 201', course_name: 'BSc CS' },
        { id: 2, name: 'Database Systems',             code: 'SCS 202', course_name: 'BSc CS' },
      ]))
    handleFilter(1)
  }, [])

  const handleFilter = async (p = 1) => {
    setLoading(true)
    try {
      const { data: res } = await attendanceService.getReport({
        ...filters,
        page: p,
        limit: PAGE_SIZE,
      })
      setData(res.records || [])
      setTotal(res.total || 0)
      setPage(p)
    } catch {
      setData([
        { student_name: 'Alice Wanjiku', reg_number: 'SCT211-0001/2024', unit_name: 'Data Structures', date: '2024-05-14', time: '09:05:00', status: 'present' },
        { student_name: 'Brian Otieno',  reg_number: 'SCT211-0002/2024', unit_name: 'Data Structures', date: '2024-05-14', time: '09:08:00', status: 'present' },
        { student_name: 'Carol Muthoni', reg_number: 'SCT211-0003/2024', unit_name: 'Data Structures', date: '2024-05-13', time: '09:22:00', status: 'late' },
        { student_name: 'David Kamau',   reg_number: 'SCT211-0004/2024', unit_name: 'Database Systems', date: '2024-05-14', time: null, status: 'absent' },
      ])
      setTotal(4)
    } finally {
      setLoading(false)
    }
  }

  const selectedUnit = units.find(u => String(u.id) === String(filters.unit_id))
  const totalPages   = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const statusCount = (s) => data.filter(r => r.status === s).length

  return (
    <PageWrapper title="Reports">
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Attendance Reports</h1>
            <p className="text-sm text-slate-500">Filter, preview and export your attendance data</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={<FileText size={14} />}
              onClick={() => attendanceService.exportAttendance({ ...filters, format: 'csv' })}>
              Export CSV
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Download size={14} />}
              onClick={() => attendanceService.exportAttendance({ ...filters, format: 'excel' })}>
              Export Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Filter Records</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Unit</label>
              <select className="input-base" value={filters.unit_id} onChange={e => setFilters(f => ({...f, unit_id: e.target.value}))}>
                <option value="">All units</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
              </select>
            </div>
            <Input label="From Date" type="date" value={filters.date_from} onChange={e => setFilters(f => ({...f, date_from: e.target.value}))} />
            <Input label="To Date"   type="date" value={filters.date_to}   onChange={e => setFilters(f => ({...f, date_to: e.target.value}))} />
            <div className="flex items-end">
              <Button variant="primary" leftIcon={<Filter size={14} />} loading={loading} onClick={() => handleFilter(1)} className="w-full">
                Apply
              </Button>
            </div>
          </div>
        </div>

        {/* Summary pills */}
        {data.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {[
              { label: 'Present', count: statusCount('present'), color: 'bg-green-50 text-green-700 border-green-100' },
              { label: 'Late',    count: statusCount('late'),    color: 'bg-amber-50 text-amber-700 border-amber-100' },
              { label: 'Absent',  count: statusCount('absent'),  color: 'bg-red-50 text-red-700 border-red-100' },
              { label: 'Total',   count: total,                  color: 'bg-slate-50 text-slate-700 border-slate-200' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`px-4 py-2 rounded-xl border text-sm font-semibold ${color}`}>
                {count} {label}
              </div>
            ))}
            {selectedUnit && (
              <div className="px-4 py-2 rounded-xl border bg-blue-50 text-blue-700 border-blue-100 text-sm font-semibold">
                {selectedUnit.name}
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Student', 'Reg Number', 'Unit', 'Date', 'Time', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({length: 5}).map((_,i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {Array.from({length:6}).map((_,j) => (
                        <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                  : data.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                          No records match your filters
                        </td>
                      </tr>
                    )
                    : data.map((r, i) => (
                      <tr key={r.id || i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-700">{r.student_name}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.reg_number}</td>
                        <td className="px-5 py-3 text-slate-600">{r.unit_name}</td>
                        <td className="px-5 py-3 text-slate-500">{r.date}</td>
                        <td className="px-5 py-3 text-slate-500">{r.time || '—'}</td>
                        <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-500">
              <span>Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, total)} of {total.toLocaleString()}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => handleFilter(page-1)} disabled={page===1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-medium">{page} / {totalPages}</span>
                <button onClick={() => handleFilter(page+1)} disabled={page===totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
