import React, { useState } from 'react'
import { Download, FileText, Table2 } from 'lucide-react'
import { downloadCSV, downloadPDF } from '../../utils/export.utils'
import Button from '../ui/Button'
import StatusBadge from '../ui/StatusBadge'

export default function ExportPanel({
  data = [],
  columns = [],
  title = 'Attendance Report',
  subtitle = '',
  filename = 'attendance',
  filters,
}) {
  const [exporting, setExporting] = useState(null)

  const handleCSV = async () => {
    setExporting('csv')
    try {
      const rows = data.map(row => {
        const obj = {}
        columns.forEach(col => {
          obj[col.label || col.key] = row[col.key] ?? ''
        })
        return obj
      })
      downloadCSV(rows, `${filename}.csv`)
    } finally {
      setExporting(null)
    }
  }

  const handlePDF = async () => {
    setExporting('pdf')
    try {
      downloadPDF({
        title,
        subtitle,
        columns,
        rows: data,
        filename: `${filename}.pdf`,
      })
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters slot */}
      {filters && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Filter Report</h3>
          {filters}
        </div>
      )}

      {/* Preview table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{data.length} records</span>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Table2 size={14} />}
              loading={exporting === 'csv'}
              onClick={handleCSV}
            >
              CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<FileText size={14} />}
              loading={exporting === 'pdf'}
              onClick={handlePDF}
            >
              PDF
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {columns.map(col => (
                  <th key={col.key} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-10 text-center text-slate-400 text-sm">
                    No data. Adjust filters and try again.
                  </td>
                </tr>
              ) : (
                data.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 table-row-hover">
                    {columns.map(col => (
                      <td key={col.key} className="px-5 py-3 text-slate-700">
                        {col.key === 'status'
                          ? <StatusBadge status={row[col.key]} />
                          : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data.length > 50 && (
          <p className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100">
            Showing first 50 of {data.length} records. Export to see all.
          </p>
        )}
      </div>
    </div>
  )
}
