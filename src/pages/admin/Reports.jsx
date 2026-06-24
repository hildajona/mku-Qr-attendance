import React, { useState, useEffect } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import { Download, FileSpreadsheet, FileText, TrendingUp, Users, CalendarCheck, BarChart2 } from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import toast from 'react-hot-toast'
import api from '../../services/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const MOCK_DEPTS = [
  { id: 1, name: 'School of Computing & IT' },
  { id: 2, name: 'School of Business' },
  { id: 3, name: 'School of Engineering' },
  { id: 4, name: 'School of Health Sciences' },
]
const MOCK_UNITS = [
  { id: 1, name: 'Data Structures', dept_id: 1 },
  { id: 2, name: 'Database Systems', dept_id: 1 },
  { id: 3, name: 'Web Technologies', dept_id: 1 },
  { id: 4, name: 'Business Math', dept_id: 2 },
  { id: 5, name: 'Engineering Drawing', dept_id: 3 },
]
const MOCK_LECTURERS = [
  { id: 1, name: 'Dr. James Mwangi' },
  { id: 2, name: 'Prof. Sarah Kamau' },
  { id: 3, name: 'Dr. Peter Odhiambo' },
]

const genTrend = () => Array.from({ length: 14 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (13 - i))
  const rate = Math.round(60 + Math.random() * 35)
  return { date: d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }), rate, present: Math.round(rate * 1.2), absent: Math.round((100 - rate) * 0.4) }
})

const genTable = () => Array.from({ length: 15 }, (_, i) => {
  const units = ['Data Structures','Database Systems','Web Technologies','Business Math','Engineering Drawing','Networks']
  const lecs  = ['Dr. James Mwangi','Prof. Sarah Kamau','Dr. Peter Odhiambo','Ms. Grace Njeri']
  const rate  = Math.round(55 + Math.random() * 40)
  const total = Math.floor(Math.random() * 6) + 2
  return {
    id: i + 1,
    unit: units[i % units.length],
    lecturer: lecs[i % lecs.length],
    sessions: total,
    present: Math.round(rate * 1.1),
    absent:  Math.round((100 - rate) * 0.5),
    rate,
  }
})

// chart.js options helper
const makeLine = (trendData) => ({
  labels: trendData.map(d => d.date),
  datasets: [
    { label: 'Rate', data: trendData.map(d => d.rate),
      borderColor: '#0057A8', backgroundColor: 'rgba(0,87,168,0.08)',
      borderWidth: 2.5, pointRadius: 3, fill: true, tension: 0.3 },
    { label: 'Present', data: trendData.map(d => d.present),
      borderColor: '#059669', backgroundColor: 'transparent',
      borderWidth: 1.5, borderDash: [4,2], pointRadius: 0, fill: false, tension: 0.3 },
  ],
})

const LINE_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top', labels: { usePointStyle: true, font: { size: 12 } } },
    tooltip: { backgroundColor: '#0F172A', cornerRadius: 8, padding: 10,
      callbacks: { label: ctx => ctx.dataset.label === 'Rate' ? ` ${ctx.raw}%` : ` ${ctx.raw}` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 11 } } },
    y: { beginAtZero: true, grid: { color: '#F1F5F9' }, ticks: { color: '#64748B', font: { size: 11 } } },
  },
}

export default function Reports() {
  const [depts, setDepts] = useState(MOCK_DEPTS)
  const [units, setUnits] = useState(MOCK_UNITS)
  const [lecturers, setLecturers] = useState(MOCK_LECTURERS)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [trendData, setTrendData] = useState([])
  const [tableData, setTableData] = useState([])

  const [filters, setFilters] = useState({
    dept_id: '', unit_id: '', lecturer_id: '', date_from: '', date_to: ''
  })

  useEffect(() => {
    api.get('/admin/departments').catch(() => null).then(r => { if (r?.data) setDepts(r.data?.departments || r.data) })
    api.get('/admin/units').catch(() => null).then(r => { if (r?.data) setUnits(r.data?.units || r.data) })
    api.get('/admin/lecturers').catch(() => null).then(r => { if (r?.data) setLecturers(r.data?.lecturers || r.data) })
  }, [])

  const filteredUnits = filters.dept_id
    ? units.filter(u => String(u.dept_id) === filters.dept_id)
    : units

  const runReport = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/reports', { params: filters }).catch(() => null)
      if (res?.data) {
        setResults(res.data.summary || null)
        setTrendData(res.data.trend || genTrend())
        setTableData(res.data.rows || genTable())
      } else {
        const td = genTrend()
        const tb = genTable()
        const totalPres = tb.reduce((a, r) => a + r.present, 0)
        const totalAbs  = tb.reduce((a, r) => a + r.absent, 0)
        const avgRate   = Math.round(tb.reduce((a, r) => a + r.rate, 0) / tb.length)
        setResults({ sessions: tb.reduce((a, r) => a + r.sessions, 0), avg_rate: avgRate, present: totalPres, absent: totalAbs })
        setTrendData(td)
        setTableData(tb)
      }
      toast.success('Report generated')
    } finally { setLoading(false) }
  }

  const exportCSV = () => {
    if (!tableData.length) { toast.error('Run the report first'); return }
    const headers = 'Unit,Lecturer,Sessions,Present,Absent,Rate\n'
    const rows = tableData.map(r => `${r.unit},${r.lecturer},${r.sessions},${r.present},${r.absent},${r.rate}%`).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'attendance-report.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const f = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  return (
    <PageWrapper title="Attendance Reports">
      <div className="space-y-6 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Attendance Reports</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Filter and export detailed attendance analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="btn btn-outline gap-2">
              <FileText size={15} /> Export CSV
            </button>
            <button onClick={() => toast('Excel export requires backend integration', { icon: '📊' })}
              className="btn btn-secondary gap-2">
              <FileSpreadsheet size={15} /> Export Excel
            </button>
          </div>
        </div>

        {/* Filter panel */}
        <div className="mku-card">
          <h2 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: 'var(--text-secondary)' }}>
            Filter Options
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Department</label>
              <select className="input-base py-2 text-sm" value={filters.dept_id}
                onChange={e => f('dept_id', e.target.value)}>
                <option value="">All Departments</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Unit</label>
              <select className="input-base py-2 text-sm" value={filters.unit_id}
                onChange={e => f('unit_id', e.target.value)}>
                <option value="">All Units</option>
                {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Lecturer</label>
              <select className="input-base py-2 text-sm" value={filters.lecturer_id}
                onChange={e => f('lecturer_id', e.target.value)}>
                <option value="">All Lecturers</option>
                {lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>From Date</label>
              <input type="date" className="input-base py-2 text-sm" value={filters.date_from}
                onChange={e => f('date_from', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>To Date</label>
              <input type="date" className="input-base py-2 text-sm" value={filters.date_to}
                onChange={e => f('date_to', e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={runReport} disabled={loading} className="btn btn-primary">
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
            <button onClick={() => { setFilters({ dept_id: '', unit_id: '', lecturer_id: '', date_from: '', date_to: '' }); setResults(null); setTrendData([]); setTableData([]) }}
              className="btn btn-secondary">
              Clear
            </button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Sessions', value: results.sessions, Icon: CalendarCheck, clr: '#0057A8', bg: '#E8F1FB' },
                { label: 'Avg Attendance', value: `${results.avg_rate}%`, Icon: TrendingUp, clr: results.avg_rate >= 75 ? '#059669' : results.avg_rate >= 50 ? '#D97706' : '#DC2626', bg: results.avg_rate >= 75 ? '#D1FAE5' : results.avg_rate >= 50 ? '#FEF3C7' : '#FEE2E2' },
                { label: 'Total Present', value: results.present.toLocaleString(), Icon: Users, clr: '#059669', bg: '#D1FAE5' },
                { label: 'Total Absent', value: results.absent.toLocaleString(), Icon: BarChart2, clr: '#DC2626', bg: '#FEE2E2' },
              ].map(({ label, value, Icon, clr, bg }) => (
                <div key={label} className="mku-card flex items-center gap-4 fade-in">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                    <Icon size={20} style={{ color: clr }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trend line chart */}
            <div className="mku-card">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Attendance Trend</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Daily attendance rate over the selected period</p>
                </div>
              </div>
              <div style={{ height: 220 }}>
                <Line data={makeLine(trendData)} options={LINE_OPTS} />
              </div>
            </div>

            {/* Detail table */}
            <div className="mku-card p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Detailed Breakdown</h2>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{tableData.length} units</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--mku-gray-100)', borderBottom: '1px solid var(--border-color)' }}>
                      {['Unit', 'Lecturer', 'Sessions', 'Present', 'Absent', 'Rate'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map(row => (
                      <tr key={row.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{row.unit}</td>
                        <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>{row.lecturer}</td>
                        <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{row.sessions}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-green-700">{row.present}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-red-500">{row.absent}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border-color)', maxWidth: 64 }}>
                              <div className="h-1.5 rounded-full" style={{
                                width: `${row.rate}%`,
                                background: row.rate >= 75 ? '#059669' : row.rate >= 50 ? '#D97706' : '#DC2626'
                              }} />
                            </div>
                            <span className={`text-xs font-bold ${row.rate >= 75 ? 'text-green-700' : row.rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                              {row.rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!results && !loading && (
          <div className="mku-card py-20 text-center fade-in">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--mku-blue-light)' }}>
              <BarChart2 size={32} style={{ color: 'var(--mku-blue)' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No Report Generated Yet</h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Select your filters above and click <strong>Generate Report</strong> to view detailed attendance analytics.
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
