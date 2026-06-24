const express  = require('express')
const { authenticate, requireRole } = require('../middleware/auth')
const { pool, isAvailable } = require('../config/db')
const { sendSMS, SMS } = require('../services/sms.service')

const router = express.Router()

// ── Helper: compute eligibility status ───────────────────────────────────────
function eligibilityStatus(pct) {
  if (pct >= 75) return 'eligible'
  if (pct >= 60) return 'at_risk'
  return 'ineligible'
}

// ── GET /api/eligibility/student/:id  (student or admin/lecturer) ──────────────
router.get('/student/:id', authenticate, async (req, res) => {
  const studentId = parseInt(req.params.id)

  // Students can only see their own
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  if (!isAvailable()) {
    // Mock data for demo mode
    return res.json({
      student_id: studentId,
      courses: [
        { id: 1, code: 'BCS301', name: 'Algorithms',      percentage: 82, total_sessions: 22, attended: 18, status: 'eligible',    sessions_needed: 0 },
        { id: 2, code: 'BCS302', name: 'Data Structures',  percentage: 68, total_sessions: 22, attended: 15, status: 'at_risk',     sessions_needed: 3 },
        { id: 3, code: 'BCS303', name: 'Networks',         percentage: 54, total_sessions: 22, attended: 12, status: 'ineligible',  sessions_needed: 6 },
      ]
    })
  }

  try {
    const [rows] = await pool.query(`
      SELECT
        u.id                                          AS unit_id,
        u.code,
        u.name,
        COUNT(DISTINCT s.id)                          AS total_sessions,
        SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) AS attended,
        COALESCE(ROUND(
          SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)
          / NULLIF(COUNT(DISTINCT s.id), 0) * 100
        , 1), 0)                                      AS percentage
      FROM enrollments e
      JOIN units u     ON u.id = e.unit_id
      LEFT JOIN sessions s  ON s.unit_id = u.id AND s.ended_at IS NOT NULL
      LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = ?
      WHERE e.student_id = ?
      GROUP BY u.id
    `, [studentId, studentId])

    const courses = rows.map(r => {
      const pct = parseFloat(r.percentage) || 0
      const status = eligibilityStatus(pct)
      // sessions needed to reach 75% (rough calc)
      const remaining = r.total_sessions - r.attended
      let sessions_needed = 0
      if (status !== 'eligible') {
        // solve: (attended + x) / (total + x) >= 0.75
        for (let x = 0; x <= 20; x++) {
          if ((r.attended + x) / (r.total_sessions + x) >= 0.75) {
            sessions_needed = x
            break
          }
        }
      }
      return { id: r.unit_id, code: r.code, name: r.name, percentage: pct, total_sessions: r.total_sessions, attended: r.attended, status, sessions_needed }
    })

    res.json({ student_id: studentId, courses })
  } catch (err) {
    console.error('Eligibility error:', err)
    res.status(500).json({ message: 'Error computing eligibility' })
  }
})

// ── POST /api/eligibility/bar/:studentId/:courseId  (admin only) ─────────────
router.post('/bar/:studentId/:courseId', authenticate, requireRole('admin'), async (req, res) => {
  if (!isAvailable()) return res.json({ message: 'Student barred (demo mode)' })
  try {
    await pool.query(
      `INSERT INTO exam_bars (student_id, unit_id, reason, barred_by, created_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE reason=VALUES(reason), barred_by=VALUES(barred_by), created_at=NOW()`,
      [req.params.studentId, req.params.courseId, req.body.reason || 'Admin decision', req.user.id]
    )
    res.json({ message: 'Student barred from exam' })
  } catch (err) {
    res.status(500).json({ message: 'Error barring student' })
  }
})

// ── GET /api/eligibility/report  (admin — exportable list) ──────────────────
router.get('/report', authenticate, requireRole('admin'), async (req, res) => {
  if (!isAvailable()) {
    return res.json({ report: [
      { student: 'Alice Wanjiku', reg_no: 'SCT221-0001/2023', course: 'BCS301', pct: 82, status: 'eligible' },
      { student: 'Brian Otieno',  reg_no: 'SCT221-0002/2023', course: 'BCS303', pct: 54, status: 'ineligible' },
    ]})
  }
  try {
    const [rows] = await pool.query(`
      SELECT
        u2.full_name AS student,
        u2.reg_number AS reg_no,
        un.code AS course,
        COALESCE(ROUND(
          SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)
          / NULLIF(COUNT(DISTINCT s.id),0)*100
        ,1), 0) AS pct
      FROM enrollments e
      JOIN users u2    ON u2.id = e.student_id
      JOIN units un    ON un.id = e.unit_id
      LEFT JOIN sessions s  ON s.unit_id = un.id AND s.ended_at IS NOT NULL
      LEFT JOIN attendance a ON a.session_id=s.id AND a.student_id=e.student_id
      GROUP BY e.student_id, un.id
      ORDER BY pct ASC
    `)
    const report = rows.map(r => ({ ...r, status: eligibilityStatus(r.pct) }))
    res.json({ report })
  } catch (err) {
    res.status(500).json({ message: 'Error generating report' })
  }
})

module.exports = router
