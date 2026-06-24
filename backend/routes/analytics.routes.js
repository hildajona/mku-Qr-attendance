const express  = require('express')
const { authenticate, requireRole } = require('../middleware/auth')
const { pool, isAvailable } = require('../config/db')

const router = express.Router()

// ─── MOCK DATA helpers ────────────────────────────────────────────────────────
const mockTrend = () => {
  const data = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    data.push({
      date: d.toISOString().slice(0, 10),
      pct: Math.round(65 + Math.random() * 25),
      sessions: Math.floor(2 + Math.random() * 6)
    })
  }
  return data
}

// ─── ADMIN ANALYTICS ─────────────────────────────────────────────────────────

// GET /api/analytics/admin/overview
router.get('/admin/overview', authenticate, requireRole('admin'), async (req, res) => {
  if (!isAvailable()) {
    return res.json({
      total_students: 1247,
      avg_attendance: 78,
      total_sessions: 43,
      at_risk_count: 156,
    })
  }
  try {
    const db = pool()
    const [[{ total_students }]] = await db.query(`SELECT COUNT(*) AS total_students FROM users WHERE role='student' AND status='active'`)
    const [[{ avg_attendance }]] = await db.query(`
      SELECT COALESCE(ROUND(AVG(pct),1), 0) AS avg_attendance FROM (
        SELECT COALESCE(ROUND(SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(s.id),0)*100,1), 0) AS pct
        FROM enrollments e
        JOIN sessions s ON s.unit_id=e.unit_id AND s.ended_at IS NOT NULL
        LEFT JOIN attendance a ON a.session_id=s.id AND a.student_id=e.student_id
        GROUP BY e.student_id, e.unit_id
      ) t`)
    const [[{ total_sessions }]] = await db.query(`SELECT COUNT(*) AS total_sessions FROM sessions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`)
    const [[{ at_risk_count }]]  = await db.query(`
      SELECT COUNT(*) AS at_risk_count FROM (
        SELECT e.student_id,
          COALESCE(ROUND(SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(s.id),0)*100,1), 0) AS pct
        FROM enrollments e
        JOIN sessions s ON s.unit_id=e.unit_id AND s.ended_at IS NOT NULL
        LEFT JOIN attendance a ON a.session_id=s.id AND a.student_id=e.student_id
        GROUP BY e.student_id, e.unit_id
        HAVING pct < 75
      ) t`)
    res.json({ total_students, avg_attendance, total_sessions, at_risk_count })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Analytics error' })
  }
})

// GET /api/analytics/admin/trend   (last 30 days)
router.get('/admin/trend', authenticate, requireRole('admin'), async (req, res) => {
  if (!isAvailable()) return res.json({ trend: mockTrend() })
  try {
    const db = pool()
    const [rows] = await db.query(`
      SELECT DATE(s.created_at) AS date,
        ROUND(SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(a.id),0)*100,1) AS pct,
        COUNT(DISTINCT s.id) AS sessions
      FROM sessions s
      LEFT JOIN attendance a ON a.session_id=s.id
      WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND s.ended_at IS NOT NULL
      GROUP BY DATE(s.created_at)
      ORDER BY date ASC`)
    res.json({ trend: rows })
  } catch (err) { res.status(500).json({ message: 'Trend error' }) }
})

// GET /api/analytics/admin/at-risk
router.get('/admin/at-risk', authenticate, requireRole('admin'), async (req, res) => {
  if (!isAvailable()) {
    return res.json({ students: [
      { id:1, name:'Alice Wanjiku',  reg_no:'SCT221-0001/2023', course:'BCS303', pct:54, trend:'down' },
      { id:2, name:'Brian Otieno',   reg_no:'SCT221-0002/2023', course:'BCS302', pct:61, trend:'stable' },
      { id:3, name:'Carol Muthoni',  reg_no:'SCT221-0003/2023', course:'BCS301', pct:68, trend:'up' },
      { id:4, name:'David Kimani',   reg_no:'SCT221-0004/2023', course:'BCS303', pct:45, trend:'down' },
      { id:5, name:'Eva Njeri',      reg_no:'SCT221-0005/2023', course:'BCS302', pct:70, trend:'up' },
    ]})
  }
  try {
    const db = pool()
    const [rows] = await db.query(`
      SELECT u.id, u.full_name AS name,
        s2.student_reg_no AS reg_no, un.code AS course, u.phone,
        COALESCE(ROUND(SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(s.id),0)*100,1), 0) AS pct
      FROM enrollments e
      JOIN users u     ON u.id=e.student_id
      LEFT JOIN students s2 ON s2.user_id=u.id
      JOIN units un    ON un.id=e.unit_id
      JOIN sessions s  ON s.unit_id=un.id AND s.ended_at IS NOT NULL
      LEFT JOIN attendance a ON a.session_id=s.id AND a.student_id=e.student_id
      GROUP BY e.student_id, un.id
      HAVING pct < 75
      ORDER BY pct ASC
      LIMIT 50`)
    res.json({ students: rows.map(r => ({ ...r, trend: 'stable' })) })
  } catch (err) { res.status(500).json({ message: 'At-risk error' }) }
})

// GET /api/analytics/admin/heatmap  (absences by day of week + hour)
router.get('/admin/heatmap', authenticate, requireRole('admin'), async (req, res) => {
  if (!isAvailable()) {
    const days  = ['Mon','Tue','Wed','Thu','Fri']
    const hours = [8,9,10,11,12,13,14,15,16,17]
    const cells = []
    days.forEach(day => hours.forEach(hour => {
      cells.push({ day, hour, absences: Math.floor(Math.random() * 15) })
    }))
    return res.json({ heatmap: cells })
  }
  try {
    const db = pool()
    const [rows] = await db.query(`
      SELECT DAYNAME(s.created_at) AS day, HOUR(s.created_at) AS hour,
        SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) AS absences
      FROM sessions s
      LEFT JOIN attendance a ON a.session_id=s.id
      WHERE s.ended_at IS NOT NULL
      GROUP BY day, hour`)
    res.json({ heatmap: rows })
  } catch (err) { res.status(500).json({ message: 'Heatmap error' }) }
})

// ─── LECTURER ANALYTICS ───────────────────────────────────────────────────────

// GET /api/analytics/lecturer/overview
router.get('/lecturer/overview', authenticate, requireRole('lecturer'), async (req, res) => {
  if (!isAvailable()) {
    return res.json({
      total_students: 87,
      avg_attendance: 74,
      sessions_run: 18,
      distribution: [
        { bucket: '90–100%', count: 12 },
        { bucket: '75–89%',  count: 35 },
        { bucket: '50–74%',  count: 28 },
        { bucket: '<50%',    count: 12 },
      ]
    })
  }
  try {
    const db = pool()
    const [dist] = await db.query(`
      SELECT
        CASE
          WHEN pct >= 90 THEN '90–100%'
          WHEN pct >= 75 THEN '75–89%'
          WHEN pct >= 50 THEN '50–74%'
          ELSE '<50%'
        END AS bucket,
        COUNT(*) AS count
      FROM (
        SELECT e.student_id,
          COALESCE(ROUND(SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(s.id),0)*100,1), 0) AS pct
        FROM enrollments e
        JOIN units un   ON un.id=e.unit_id AND un.lecturer_id=?
        JOIN sessions s ON s.unit_id=un.id AND s.ended_at IS NOT NULL
        LEFT JOIN attendance a ON a.session_id=s.id AND a.student_id=e.student_id
        GROUP BY e.student_id, e.unit_id
      ) t GROUP BY bucket`, [req.user.id])
    res.json({ distribution: dist })
  } catch (err) { res.status(500).json({ message: 'Lecturer analytics error' }) }
})

// ─── STUDENT ANALYTICS ────────────────────────────────────────────────────────

// GET /api/analytics/student/timeline
router.get('/student/timeline', authenticate, async (req, res) => {
  const studentId = req.user.id
  if (!isAvailable()) {
    const courses = ['BCS301','BCS302','BCS303']
    const timeline = courses.map(code => {
      const points = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        points.push({ date: d.toISOString().slice(0,10), pct: Math.round(55 + Math.random()*35) })
      }
      return { code, points }
    })
    return res.json({ timeline, streak: 5, class_avg: 74 })
  }
  try {
    const db = pool()
    const [enrollments] = await db.query(
      `SELECT un.code FROM enrollments e JOIN units un ON un.id=e.unit_id WHERE e.student_id=?`,
      [studentId]
    )
    const timeline = []
    for (const enr of enrollments) {
      const [points] = await db.query(
        `SELECT DATE(s.started_at) AS date,
           MAX(CASE WHEN a.status IN ('present','late') THEN 100 ELSE 0 END) AS pct
         FROM sessions s
         LEFT JOIN attendance a ON a.session_id=s.id AND a.student_id=?
         JOIN units un ON un.id=s.unit_id AND un.code=?
         WHERE s.started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(s.started_at)
         ORDER BY date ASC`,
        [studentId, enr.code]
      )
      timeline.push({ code: enr.code, points })
    }
    res.json({ timeline, streak: 0, class_avg: 0 })
  } catch (err) {
    res.status(500).json({ message: 'Student analytics error' })
  }
})

module.exports = router
