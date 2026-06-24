const express    = require('express')
const PDFDocument = require('pdfkit')
const ExcelJS    = require('exceljs')
const path       = require('path')
const { authenticate, requireRole } = require('../middleware/auth')
const { pool, isAvailable } = require('../config/db')
const mock       = require('../config/mockData')

const router = express.Router()
const THRESHOLD = 75  // minimum attendance % for exam eligibility

// ── Helper: compute mock eligibility for a student ───────────────────────────
function mockEligibility(studentId) {
  const enr = mock.enrollments.filter(e => e.student_id === studentId)
  return enr.map(e => {
    const unit      = mock.units.find(u => u.id === e.unit_id)
    const course    = mock.courses.find(c => c.id === unit?.course_id)
    const dept      = mock.departments.find(d => d.id === course?.department_id)
    const unitSess  = mock.sessions.filter(s => s.unit_id === e.unit_id && s.ended_at)
    const total     = unitSess.length
    const attended  = mock.attendance.filter(a =>
      a.student_id === studentId &&
      unitSess.find(s => s.id === a.session_id) &&
      (a.status === 'present' || a.status === 'late')
    ).length
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0
    return {
      unit_id: unit?.id, unit_name: unit?.name, unit_code: unit?.code,
      course_name: course?.name, course_code: course?.code,
      department: dept?.name || '',
      total_sessions: total, attended, percentage,
      eligible: percentage >= THRESHOLD,
    }
  })
}

// ── GET /api/reports/student/:id/exam-card ────────────────────────────────────
// Returns 403 if any enrolled unit is below 75%, otherwise streams a PDF exam card
router.get('/student/:id/exam-card', authenticate, async (req, res) => {
  const studentId = parseInt(req.params.id)

  // Students can only generate their own card
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  try {
    let studentInfo = null
    let units       = []

    if (isAvailable()) {
      const db = pool()
      const [[stu]] = await db.query(
        `SELECT u.full_name AS name, u.email, u.phone,
                s.student_reg_no AS reg_number, s.programme AS course,
                s.year_of_study, s.semester, s.department
         FROM users u LEFT JOIN students s ON s.user_id=u.id
         WHERE u.id=?`, [studentId]
      )
      if (!stu) return res.status(404).json({ message: 'Student not found' })
      studentInfo = stu

      const [rows] = await db.query(`
        SELECT un.id AS unit_id, un.name AS unit_name, un.code AS unit_code,
               c.name AS course_name, d.name AS department,
               COUNT(DISTINCT s.id) AS total_sessions,
               SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) AS attended,
               COALESCE(ROUND(
                 SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)
                 / NULLIF(COUNT(DISTINCT s.id), 0) * 100
               , 1), 0) AS percentage
        FROM enrollments e
        JOIN units un     ON un.id = e.unit_id
        JOIN courses c    ON c.id  = un.course_id
        LEFT JOIN departments d ON d.id = c.department_id
        LEFT JOIN sessions s ON s.unit_id = un.id AND s.ended_at IS NOT NULL
        LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = ?
        WHERE e.student_id = ?
        GROUP BY un.id
      `, [studentId, studentId])
      units = rows.map(r => ({ ...r, eligible: parseFloat(r.percentage) >= THRESHOLD }))
    } else {
      // Mock mode
      const stu = mock.users.find(u => u.id === studentId)
      if (!stu) return res.status(404).json({ message: 'Student not found' })
      studentInfo = { name: stu.name, email: stu.email, reg_number: stu.reg_number, course: stu.course, year_of_study: 2, semester: 1 }
      units = mockEligibility(studentId)
    }

    const ineligible = units.filter(u => !u.eligible)
    if (ineligible.length > 0) {
      return res.status(403).json({
        message: 'Exam card cannot be issued — attendance requirement not met in some units.',
        ineligible: ineligible.map(u => ({
          unit: u.unit_name,
          code: u.unit_code,
          percentage: u.percentage,
          required: THRESHOLD,
        })),
      })
    }

    // ── All units eligible — generate PDF ─────────────────────────────────
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=exam_card_${studentInfo.reg_number || studentId}.pdf`)
    doc.pipe(res)

    // Logo
    const logoPath = path.join(__dirname, '..', 'public', 'mku-logo.png')
    try { doc.image(logoPath, 240, 35, { width: 80 }); doc.moveDown(4) } catch { doc.moveDown(1) }

    // Header
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#0057A8').text('MOUNT KENYA UNIVERSITY', { align: 'center' })
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#E6A800').text('THIKA MAIN CAMPUS', { align: 'center' })
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#6B7280').text('"Unlocking Infinite Possibilities"', { align: 'center' })
    doc.moveDown(0.5)

    // Title box
    const titleY = doc.y
    doc.rect(50, titleY, 495, 28).fillAndStroke('#0057A8', '#0057A8')
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#FFFFFF')
      .text('EXAMINATION ADMISSION CARD', 50, titleY + 7, { align: 'center', width: 495 })
    doc.moveDown(1.8)

    // Academic period
    const now = new Date()
    const semLabel = (studentInfo.semester === 2) ? 'Semester II' : 'Semester I'
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827')
      .text(`Academic Year: ${now.getFullYear()}/${now.getFullYear() + 1}   |   ${semLabel}   |   Year ${studentInfo.year_of_study || '—'}`, { align: 'center' })
    doc.moveDown(0.8)

    // Student info table
    const infoY = doc.y
    doc.rect(50, infoY, 495, 90).stroke('#D1D5DB')

    const col1 = 60, col2 = 220, col3 = 360
    const rowH = 18

    const infoRows = [
      ['Student Name:', studentInfo.name, 'Reg. Number:', studentInfo.reg_number || '—'],
      ['Programme:',   studentInfo.course || '—', 'Email:', studentInfo.email || '—'],
      ['Department:',  units[0]?.department || '—', 'Semester:', semLabel],
      ['Year of Study:', `Year ${studentInfo.year_of_study || '—'}`, 'Generated:', now.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })],
    ]

    infoRows.forEach((row, i) => {
      const y = infoY + 8 + i * rowH
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text(row[0], col1, y)
      doc.fontSize(9).font('Helvetica').fillColor('#111827').text(row[1], col1 + 85, y, { width: 130 })
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text(row[2], col2 + 90, y)
      doc.fontSize(9).font('Helvetica').fillColor('#111827').text(row[3], col2 + 175, y, { width: 150 })
    })

    doc.moveDown(5.5)

    // Units table header
    const tableTop = doc.y
    doc.rect(50, tableTop, 495, 20).fillAndStroke('#F1F5F9', '#D1D5DB')
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151')
    doc.text('Unit Code', 60, tableTop + 5, { width: 80 })
    doc.text('Unit Name', 145, tableTop + 5, { width: 180 })
    doc.text('Sessions', 330, tableTop + 5, { width: 60 })
    doc.text('Attended', 395, tableTop + 5, { width: 60 })
    doc.text('Attendance %', 458, tableTop + 5, { width: 80 })

    let rowY = tableTop + 20
    units.forEach((u, i) => {
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F9FAFB'
      doc.rect(50, rowY, 495, 18).fillAndStroke(bg, '#E5E7EB')
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1E3A5F').text(u.unit_code, 60, rowY + 4, { width: 80 })
      doc.fontSize(8.5).font('Helvetica').fillColor('#111827').text(u.unit_name, 145, rowY + 4, { width: 180 })
      doc.fontSize(8.5).font('Helvetica').fillColor('#374151').text(String(u.total_sessions), 330, rowY + 4, { width: 60 })
      doc.fontSize(8.5).font('Helvetica').fillColor('#374151').text(String(u.attended), 395, rowY + 4, { width: 60 })
      // Colour-coded percentage
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#16A34A').text(`${u.percentage}% ✓`, 458, rowY + 4, { width: 80 })
      rowY += 18
    })

    // Border around whole table
    doc.rect(50, tableTop, 495, rowY - tableTop).stroke('#D1D5DB')

    doc.moveDown(1.2)

    // Eligibility stamp
    const stampY = doc.y
    doc.rect(50, stampY, 495, 36).fillAndStroke('#DCFCE7', '#16A34A')
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#15803D')
      .text('✓  ELIGIBLE TO SIT EXAMINATIONS — ALL ATTENDANCE REQUIREMENTS MET', 50, stampY + 10, { align: 'center', width: 495 })
    doc.moveDown(1.5)

    // Signature lines
    const sigY = doc.y
    doc.moveTo(60,  sigY + 20).lineTo(220, sigY + 20).stroke('#9CA3AF')
    doc.moveTo(280, sigY + 20).lineTo(440, sigY + 20).stroke('#9CA3AF')
    doc.fontSize(8).font('Helvetica').fillColor('#6B7280')
    doc.text('Student Signature',   60, sigY + 23, { width: 160, align: 'center' })
    doc.text('Registrar / HOD Stamp', 280, sigY + 23, { width: 160, align: 'center' })

    doc.moveDown(2.5)

    // Footer
    doc.fontSize(7.5).fillColor('#9CA3AF')
      .text(`This card was generated automatically by CAMS on ${now.toLocaleString('en-KE')}. It is valid only for the current examination period.`, { align: 'center' })
    doc.text('Mount Kenya University — Thika Main Campus   |   cams.mku.ac.ke', { align: 'center' })

    doc.end()

  } catch (err) {
    console.error('Exam card error:', err)
    if (!res.headersSent) res.status(500).json({ message: 'Error generating exam card' })
  }
})

// ── GET /api/reports/student/:id/pdf  (attendance report, kept for backwards compat) ──
router.get('/student/:id/pdf', authenticate, async (req, res) => {
  const studentId = parseInt(req.params.id)
  try {
    let studentName = 'Student'
    let regNo = req.params.id
    let unitData = []

    if (isAvailable()) {
      const db = pool()
      const [[stu]] = await db.query(
        `SELECT u.full_name AS name, s.student_reg_no AS reg_number
         FROM users u LEFT JOIN students s ON s.user_id=u.id WHERE u.id=?`, [studentId]
      )
      studentName = stu?.name || 'Student'
      regNo       = stu?.reg_number || req.params.id
      const [rows] = await db.query(`
        SELECT un.code, un.name,
          COALESCE(ROUND(SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(DISTINCT s.id),0)*100,1),0) AS percentage
        FROM enrollments e
        JOIN units un ON un.id=e.unit_id
        LEFT JOIN sessions s ON s.unit_id=un.id AND s.ended_at IS NOT NULL
        LEFT JOIN attendance a ON a.session_id=s.id AND a.student_id=?
        WHERE e.student_id=? GROUP BY un.id`, [studentId, studentId]
      )
      unitData = rows
    } else {
      const stu = mock.users.find(u => u.id === studentId)
      studentName = stu?.name || 'Student'
      regNo       = stu?.reg_number || req.params.id
      unitData    = mockEligibility(studentId).map(u => ({ code: u.unit_code, name: u.unit_name, percentage: u.percentage }))
    }

    const doc = new PDFDocument({ margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${regNo}.pdf`)
    doc.pipe(res)

    const logoPath = path.join(__dirname, '..', 'public', 'mku-logo.png')
    try { doc.image(logoPath, 250, 40, { width: 90 }); doc.moveDown(5) } catch { doc.moveDown() }

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#0057A8').text('MOUNT KENYA UNIVERSITY', { align: 'center' })
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#E6A800').text('THIKA MAIN CAMPUS', { align: 'center' })
    doc.fontSize(10).font('Helvetica-Oblique').fillColor('#6B7280').text('"Unlocking Infinite Possibilities"', { align: 'center' })
    doc.moveDown()
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('Student Attendance Report', { align: 'center' })
    doc.moveDown()
    doc.fontSize(11).font('Helvetica').fillColor('#111827')
      .text(`Student: ${studentName}`)
      .text(`Reg No: ${regNo}`)
      .text(`Generated: ${new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}`)
    doc.moveDown(1.5)

    const tY = doc.y
    doc.rect(50, tY, 445, 20).fillAndStroke('#F1F5F9', '#D1D5DB')
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151')
    doc.text('Unit Code', 60, tY + 5, { width: 80 })
    doc.text('Unit Name',  145, tY + 5, { width: 220 })
    doc.text('Attendance %', 370, tY + 5, { width: 100 })
    doc.moveDown()

    doc.moveTo(50, doc.y).lineTo(495, doc.y).stroke()
    doc.font('Helvetica').fontSize(10).fillColor('#111827')
    unitData.forEach(u => {
      const y = doc.y
      const color = u.percentage >= 75 ? '#16A34A' : '#DC2626'
      doc.text(u.code, 60, y, { width: 80 })
      doc.text(u.name, 145, y, { width: 220 })
      doc.fillColor(color).text(`${u.percentage}%`, 370, y, { width: 100 })
      doc.fillColor('#111827').moveDown(0.5)
    })

    doc.moveTo(50, doc.y).lineTo(495, doc.y).stroke()
    doc.moveDown(2)
    doc.fontSize(9).fillColor('#6B7280').text('CAMS — Campus Attendance Management System, Mount Kenya University © 2026', { align: 'center' })
    doc.end()
  } catch (err) {
    console.error('PDF error:', err)
    if (!res.headersSent) res.status(500).json({ message: 'Error generating PDF' })
  }
})

// ── GET /api/reports/lecturer/:courseId/excel ─────────────────────────────────
router.get('/lecturer/:courseId/excel', authenticate, async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'MKU Attend — Thika Main Campus'
    workbook.created = new Date()
    const sheet = workbook.addWorksheet('Attendance')
    sheet.columns = [
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Reg Number',   key: 'reg_no', width: 20 },
      { header: 'Attendance %', key: 'percent', width: 15 },
      { header: 'Status',       key: 'status', width: 15 },
    ]
    if (isAvailable()) {
      const db = pool()
      const [rows] = await db.query(`
        SELECT u.full_name AS name, s2.student_reg_no AS reg_no,
          COALESCE(ROUND(SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(DISTINCT s.id),0)*100,1),0) AS percent
        FROM enrollments e
        JOIN users u ON u.id=e.student_id
        LEFT JOIN students s2 ON s2.user_id=u.id
        JOIN units un ON un.id=e.unit_id AND un.course_id=?
        LEFT JOIN sessions s ON s.unit_id=un.id AND s.ended_at IS NOT NULL
        LEFT JOIN attendance a ON a.session_id=s.id AND a.student_id=e.student_id
        GROUP BY e.student_id ORDER BY u.full_name`, [req.params.courseId]
      )
      rows.forEach(r => sheet.addRow({ ...r, percent: `${r.percent}%`, status: r.percent >= 75 ? 'Eligible' : r.percent >= 60 ? 'At Risk' : 'Ineligible' }))
    } else {
      sheet.addRow({ name: 'Alice Wanjiku', reg_no: 'SCT211-0001/2024', percent: '82%', status: 'Eligible' })
      sheet.addRow({ name: 'Brian Otieno',  reg_no: 'SCT211-0002/2024', percent: '68%', status: 'At Risk' })
    }
    sheet.getRow(1).font = { bold: true }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=course_${req.params.courseId}_attendance.xlsx`)
    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    console.error('Excel error:', err)
    if (!res.headersSent) res.status(500).json({ message: 'Error generating Excel' })
  }
})

module.exports = router
