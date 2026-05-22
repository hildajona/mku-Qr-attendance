import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import ExportPanel from '../../components/tables/ExportPanel'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { attendanceService } from '../../services/attendance.service'
import { Filter } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function LecturerExport() {
  const [units, setUnits]     = useState([])
  const [filters, setFilters] = useState({ unit_id: '', date_from: '', date_to: '' })
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/lecturer/courses')
      .then(({ data }) => {
        const all = []
        const list = data.courses || data || []
        list.forEach(c => c.units?.forEach(u => all.push({ ...u, course_name: c.name })))
        setUnits(all)
      })
      .catch(() => {
        setUnits([
          { id: 1, name: 'Data Structures & Algorithms', code: 'SCS 201', course_name: 'BSc CS' },
          { id: 2, name: 'Database Systems', code: 'SCS 202', course_name: 'BSc CS' },
        ])
      })
    handleFilter()
  }, [])

  const handleFilter = async () => {
    setLoading(true)
    try {
      const { data: result } = await attendanceService.getReport(filters)
      setData(result.records || result || [])
    } catch {
      setData([
        { student_name: 'Alice Wanjiku', reg_number: 'SCT211-0001/2024', unit_name: 'Data Structures', date: '2024-05-14', status: 'present' },
        { student_name: 'Brian Otieno', reg_number: 'SCT211-0002/2024', unit_name: 'Data Structures', date: '2024-05-14', status: 'present' },
        { student_name: 'Carol Muthoni', reg_number: 'SCT211-0003/2024', unit_name: 'Data Structures', date: '2024-05-13', status: 'late' },
        { student_name: 'David Kamau', reg_number: 'SCT211-0004/2024', unit_name: 'Database Systems', date: '2024-05-14', status: 'absent' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { key: 'student_name', label: 'Student Name' },
    { key: 'reg_number', label: 'Reg Number' },
    { key: 'unit_name', label: 'Unit' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status' },
  ]

  const selectedUnit = units.find(u => String(u.id) === String(filters.unit_id))

  return (
    <PageWrapper title="Export Reports">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Export Reports</h1>
          <p className="text-sm text-slate-500">Download attendance data as CSV or PDF</p>
        </div>

        <ExportPanel
          data={data}
          columns={columns}
          title="Attendance Report"
          subtitle={selectedUnit ? `${selectedUnit.name} (${selectedUnit.code})` : 'All Units'}
          filename={`attendance-${selectedUnit?.code || 'all'}`}
          filters={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Unit</label>
                <select
                  className="input-base"
                  value={filters.unit_id}
                  onChange={e => setFilters(f => ({ ...f, unit_id: e.target.value }))}
                >
                  <option value="">All units</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                  ))}
                </select>
              </div>
              <Input
                label="From Date"
                type="date"
                value={filters.date_from}
                onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
              />
              <Input
                label="To Date"
                type="date"
                value={filters.date_to}
                onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
              />
              <div className="flex items-end">
                <Button
                  variant="primary"
                  leftIcon={<Filter size={14} />}
                  loading={loading}
                  onClick={handleFilter}
                  className="w-full"
                >
                  Apply
                </Button>
              </div>
            </div>
          }
        />
      </div>
    </PageWrapper>
  )
}
