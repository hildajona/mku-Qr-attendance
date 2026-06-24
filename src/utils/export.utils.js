import jsPDF from 'jspdf'
import Papa from 'papaparse'

/**
 * Download data as CSV
 * @param {Array<Object>} data
 * @param {string} filename
 */
export function downloadCSV(data, filename = 'export.csv') {
  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Download attendance report as PDF
 * @param {Object} options
 */
export function downloadPDF({
  title = 'Attendance Report',
  subtitle = '',
  columns = [],
  rows = [],
  filename = 'report.pdf',
  universityName = 'CAMS – Campus Attendance Management System',
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 15
  let y = margin

  // Header bar
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageW, 22, 'F')

  // University name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(universityName, margin, 14)

  // Generated date
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - margin, 14, { align: 'right' })

  y = 32

  // Title
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title, margin, y)
  y += 7

  if (subtitle) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(subtitle, margin, y)
    y += 8
  }

  // Divider
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  if (columns.length === 0 || rows.length === 0) {
    doc.setFontSize(11)
    doc.setTextColor(148, 163, 184)
    doc.text('No data available for the selected filters.', margin, y + 10)
    doc.save(filename)
    return
  }

  // Calculate column widths
  const usableW = pageW - margin * 2
  const colW = usableW / columns.length

  // Table header
  doc.setFillColor(241, 245, 249)
  doc.rect(margin, y, usableW, 9, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  columns.forEach((col, i) => {
    doc.text(col.label || col, margin + i * colW + 3, y + 6)
  })
  y += 9

  // Table rows
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  rows.forEach((row, rowIdx) => {
    if (y > pageH - 20) {
      doc.addPage()
      y = margin
    }
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(margin, y, usableW, 8, 'F')
    }
    doc.setTextColor(30, 41, 59)
    columns.forEach((col, i) => {
      const key = col.key || col
      const val = row[key] !== undefined ? String(row[key]) : ''
      doc.text(val.substring(0, 30), margin + i * colW + 3, y + 5.5)
    })
    // Row border
    doc.setDrawColor(241, 245, 249)
    doc.line(margin, y + 8, pageW - margin, y + 8)
    y += 8
  })

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(`Total records: ${rows.length}`, margin, pageH - 8)
  doc.text(`Page 1`, pageW - margin, pageH - 8, { align: 'right' })

  doc.save(filename)
}

/**
 * Parse a CSV file and return array of objects
 */
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    })
  })
}
