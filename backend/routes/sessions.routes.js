const express   = require('express')
const { pool, isAvailable } = require('../config/db')
const redis     = require('../config/redis')
const mock      = require('../config/mockData')
const { generateQRToken, verifyQRToken } = require('../utils/qrToken')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()

function enrichSession(s) {
  const unit   = mock.units.find(u => u.id === s.unit_id)
  const course = mock.courses.find(c => c.id === unit?.course_id)
  const count  = mock.attendance.filter(a => a.session_id === s.id).length
  return { ...s, unit_name: unit?.name, unit_code: unit?.code, course_name: course?.name, attendance_count: count }
}

// ── POST /api/sessions ─────────────────────────────────────────────────────
router.post('/', authenticate, requireRole('lecturer'), async (req, res) => {
  const { unit_id, room, duration_minutes = 60, qr_expiry_seconds = 300, lat, lng, radius_meters } = req.body
  if (!unit_id) return res.status(400).json({ message: 'unit_id is required' })

  const expiry  = Math.min(Math.max(parseInt(qr_expiry_seconds), 60), 900)
  const { token, expires_at } = generateQRToken('PENDING', expiry)

  try {
    if (isAvailable()) {
      const db = pool()
      const [result] = await db.query(
        `INSERT INTO sessions
           (unit_id, lecturer_id, room, expires_at, duration_minutes, qr_token, qr_expiry_seconds, lat, lng, radius_meters)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [unit_id, req.user.id, room || null, expires_at, duration_minutes, token, expiry,
         lat || null, lng || null, radius_meters || null]
      )
      // Re-sign token with real session id
      const sessionId = result.insertId.toString()
      const { token: realToken, expires_at: realExpiry } = generateQRToken(sessionId, expiry)
      await db.query('UPDATE sessions SET qr_token=? WHERE id=?', [realToken, sessionId])
      await redis.cacheToken(realToken, sessionId, expiry)

      const [[session]] = await db.query(
        `SELECT s.*, u.name as unit_name, u.code as unit_code, c.name as course_name
         FROM sessions s
         JOIN units u ON u.id=s.unit_id
         JOIN courses c ON c.id=u.course_id
         WHERE s.id=?`, [sessionId]
      )
      return res.status(201).json({ session: { ...session, qr_token: realToken } })
    }

    // Mock path
    const id = mock.nextID('sessions')
    const { token: realToken, expires_at: realExpiry } = generateQRToken(String(id), expiry)
    const session = {
      id, unit_id: parseInt(unit_id), lecturer_id: req.user.id,
      room: room || null, started_at: new Date().toISOString(),
      expires_at: realExpiry, duration_minutes, qr_token: realToken,
      qr_expiry_seconds: expiry, is_active: true, ended_at: null,
    }
    mock.sessions.push(session)
    await redis.cacheToken(realToken, String(id), expiry)
    return res.status(201).json({ session: enrichSession(session) })
  } catch (err) {
    console.error('[sessions] create error:', err.message)
    res.status(500).json({ message: 'Failed to create session' })
  }
})

// ── GET /api/sessions/active ───────────────────────────────────────────────
router.get('/active', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [rows] = await db.query(
        `SELECT s.*, u.name as unit_name, c.name as course_name, COUNT(a.id) as attendance_count
         FROM sessions s
         JOIN units u ON u.id=s.unit_id
         JOIN courses c ON c.id=u.course_id
         LEFT JOIN attendance a ON a.session_id=s.id
         WHERE s.is_active=1
         GROUP BY s.id ORDER BY s.started_at DESC`
      )
      return res.json({ sessions: rows })
    }
    res.json({ sessions: mock.sessions.filter(s => s.is_active).map(enrichSession) })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/sessions/lecturer ─────────────────────────────────────────────
router.get('/lecturer', authenticate, requireRole('lecturer'), async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [today] = await db.query(
        `SELECT s.*, u.name as unit_name, c.name as course_name, COUNT(a.id) as attendance_count
         FROM sessions s
         JOIN units u ON u.id=s.unit_id JOIN courses c ON c.id=u.course_id
         LEFT JOIN attendance a ON a.session_id=s.id
         WHERE s.lecturer_id=? AND DATE(s.started_at)=CURDATE()
         GROUP BY s.id ORDER BY s.started_at DESC`,
        [req.user.id]
      )
      const [recent] = await db.query(
        `SELECT s.*, u.name as unit_name, c.name as course_name, COUNT(a.id) as attendance_count
         FROM sessions s
         JOIN units u ON u.id=s.unit_id JOIN courses c ON c.id=u.course_id
         LEFT JOIN attendance a ON a.session_id=s.id
         WHERE s.lecturer_id=? AND DATE(s.started_at)<CURDATE()
         GROUP BY s.id ORDER BY s.started_at DESC LIMIT 10`,
        [req.user.id]
      )
      const myUnitIds = mock.lecturerAssignments.filter(la => la.lecturer_id === req.user.id).map(la => la.unit_id)
      return res.json({
        today_sessions: today, recent,
        stats: { sessions_today: today.length, total_students: 0, avg_attendance: 0 }
      })
    }

    const mySessions = mock.sessions.filter(s => s.lecturer_id === req.user.id)
    const today      = mySessions.filter(s => new Date(s.started_at).toDateString() === new Date().toDateString())
    const recent     = mySessions.filter(s => new Date(s.started_at).toDateString() !== new Date().toDateString()).slice(0, 10)
    const myUnitIds  = mock.lecturerAssignments.filter(la => la.lecturer_id === req.user.id).map(la => la.unit_id)
    const totalStudents = new Set(mock.enrollments.filter(e => myUnitIds.includes(e.unit_id)).map(e => e.student_id)).size
    res.json({
      today_sessions: today.map(enrichSession),
      recent: recent.map(enrichSession),
      stats: { sessions_today: today.length, total_students: totalStudents, avg_attendance: 82 },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/sessions/:id ──────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [[session]] = await db.query(
        `SELECT s.*, u.name as unit_name, u.code as unit_code, c.name as course_name
         FROM sessions s JOIN units u ON u.id=s.unit_id JOIN courses c ON c.id=u.course_id
         WHERE s.id=?`, [req.params.id]
      )
      if (!session) return res.status(404).json({ message: 'Session not found' })
      return res.json({ session })
    }
    const session = mock.sessions.find(s => String(s.id) === String(req.params.id))
    if (!session) return res.status(404).json({ message: 'Session not found' })
    res.json({ session: enrichSession(session) })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/sessions/:id/regenerate-qr ──────────────────────────────────
router.post('/:id/regenerate-qr', authenticate, requireRole('lecturer'), async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [[session]] = await db.query('SELECT * FROM sessions WHERE id=? AND lecturer_id=?', [req.params.id, req.user.id])
      if (!session) return res.status(404).json({ message: 'Session not found' })
      await redis.deleteToken(session.qr_token)
      const { token, expires_at } = generateQRToken(String(req.params.id), session.qr_expiry_seconds)
      await db.query('UPDATE sessions SET qr_token=?, expires_at=? WHERE id=?', [token, expires_at, req.params.id])
      await redis.cacheToken(token, String(req.params.id), session.qr_expiry_seconds)
      return res.json({ qr_token: token, expires_at })
    }

    const session = mock.sessions.find(s => String(s.id) === String(req.params.id) && s.lecturer_id === req.user.id)
    if (!session) return res.status(404).json({ message: 'Session not found' })
    await redis.deleteToken(session.qr_token)
    const { token, expires_at } = generateQRToken(String(req.params.id), session.qr_expiry_seconds)
    session.qr_token  = token
    session.expires_at = expires_at
    await redis.cacheToken(token, String(req.params.id), session.qr_expiry_seconds)
    res.json({ qr_token: token, expires_at })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUT /api/sessions/:id/end ──────────────────────────────────────────────
router.put('/:id/end', authenticate, requireRole('lecturer'), async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [[session]] = await db.query('SELECT qr_token FROM sessions WHERE id=? AND lecturer_id=?', [req.params.id, req.user.id])
      if (session) await redis.deleteToken(session.qr_token)
      await db.query('UPDATE sessions SET is_active=0, ended_at=NOW() WHERE id=? AND lecturer_id=?', [req.params.id, req.user.id])
      return res.json({ message: 'Session ended' })
    }
    const session = mock.sessions.find(s => String(s.id) === String(req.params.id) && s.lecturer_id === req.user.id)
    if (session) {
      await redis.deleteToken(session.qr_token)
      session.is_active = false
      session.ended_at  = new Date().toISOString()
    }
    res.json({ message: 'Session ended' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
