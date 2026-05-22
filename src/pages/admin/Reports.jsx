import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import ExportPanel from '../../components/tables/ExportPanel'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { attendanceService } from '../../services/attendance.service'
import { Filter } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Reports() {
  const [filters, setFilters] = useState({ course: '', unit: '', student: '', date_from: '', date_to: '' })
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(false)

  const handleFilter = async () => {
    setLoading(true)
    try {
      const { data: result } = await attendanceService.getReport(filters)
      setData(result.records || result || [])
    } catch {
      // Mock data
      setData([
        { student_name: 'Alice Wanjiku', reg_number: 'SCT211-0001/2024', unit_name: 'Data Structures', date: '2024-05-14', status: 'present' },
        { student_name: 'Brian Otieno', reg_number: 'SCT211-0002/2024', unit_name: 'Data Structures', date: '2024-05-14', status: 'present' },
        { student_name: 'Carol Muthoni', reg_number: 'SCT211-0003/2024', unit_name: 'Database Systems', date: '2024-05-14', status: 'late' },
        { student_name: 'David Kamau', reg_number: 'SCT211-0004/2024', unit_name: 'Calculus II', date: '2024-05-14', status: 'absent' },
        { student_name: 'Eve Njeri', reg_number: 'SCT211-0005/2024', unit_name: 'Web Development', date: '2024-05-14', status: 'present' },
      ])
      toast.success('Loaded mock data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { handleFilter() }, [])

  const columns = [
    { key: 'student_name', label: 'Student Name' },
    { key: 'reg_number', label: 'Reg Number' },
    { key: 'unit_name', label: 'Unit' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status' },
  ]

  return (
    <PageWrapper title="Reports">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Attendance Reports</h1>
          <p className="text-sm text-slate-500">Filter and export attendance data</p>
        </div>

        <ExportPanel
          data={data}
          columns={columns}
          title="Attendance Report"
          subtitle={`Generated on ${new Date().toLocaleDateString()}`}
          filename="mku-attendance-report"
          filters={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input
                label="Course"
                placeholder="All courses"
                value={filters.course}
                onChange={e => setFilters(f => ({ ...f, course: e.target.value }))}
              />
              <Input
                label="Unit"
                placeholder="All units"
                value={filters.unit}
                onChange={e => setFilters(f => ({ ...f, unit: e.target.value }))}
              />
              <Input
                label="Student"
                placeholder="Reg number or name"
                value={filters.student}
                onChange={e => setFilters(f => ({ ...f, student: e.target.value }))}
              />
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
                  size="md"
                  leftIcon={<Filter size={14} />}
                  loading={loading}
                  onClick={handleFilter}
                  className="w-full"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          }
        />
      </div>
    </PageWrapper>
  )
}
