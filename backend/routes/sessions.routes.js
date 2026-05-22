const express = require('express')
const { v4: uuidv4 } = require('uuid')
const crypto = require('crypto')
const { pool, isAvailable } = require('../config/db')
const mock    = require('../config/mockData')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function enrichSession(s) {
  const unit   = mock.units.find(u => u.id === s.unit_id)
  const course = mock.courses.find(c => c.id === unit?.course_id)
  const count  = mock.attendance.filter(a => a.session_id === s.id).length
  return { ...s, unit_name: unit?.name, unit_code: unit?.code, course_name: course?.name, attendance_count: count }
}

// POST /api/sessions
router.post('/', authenticate, requireRole('lecturer'), async (req, res) => {
  const {
    unit_id,
    room,
    duration_minutes = 60,
    qr_expiry_seconds = 300,
    classroom_name,
    latitude,
    longitude,
    radius_meters = 100,
  } = req.body

  if (!unit_id) return res.status(400).json({ message: 'unit_id is required' })
  try {
    const qr_token = uuidv4()
    const qr_token_hash = hashToken(qr_token)
    const expires_at = new Date(Date.now() + qr_expiry_seconds * 1000).toISOString()
    const lat = latitude != null ? parseFloat(latitude) : null
    const lng = longitude != null ? parseFloat(longitude) : null
    const radius = radius_meters != null ? parseInt(radius_meters, 10) : 100

    if (isAvailable()) {
      const db = pool()
      const [result] = await db.query(
        'INSERT INTO sessions (unit_id,lecturer_id,room,expires_at,duration_minutes,qr_token,qr_token_hash,qr_expiry_seconds,classroom_name,latitude,longitude,radius_meters) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [unit_id, req.user.id, room || null, expires_at, duration_minutes, qr_token, qr_token_hash, qr_expiry_seconds, classroom_name || null, lat, lng, radius]
      )
      const [[session]] = await db.query(
        'SELECT s.*,u.name as unit_name,u.code as unit_code,c.id as course_id,c.name as course_name FROM sessions s JOIN units u ON u.id=s.unit_id JOIN courses c ON c.id=u.course_id WHERE s.id=?',
        [result.insertId]
      )
      session.qr_token = qr_token
      return res.status(201).json({ session })
    }

    const id = mock.nextID('sessions')
    const session = {
      id,
      unit_id: parseInt(unit_id),
      lecturer_id: req.user.id,
      room: room || null,
      classroom_name: classroom_name || null,
      latitude: lat,
      longitude: lng,
      radius_meters: radius,
      started_at: new Date().toISOString(),
      expires_at,
      duration_minutes,
      qr_token,
      qr_expiry_seconds,
      is_active: true,
      ended_at: null,
    }
    mock.sessions.push(session)
    res.status(201).json({ session: enrichSession(session) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/sessions/active
router.get('/active', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [sessions] = await db.query(
        'SELECT s.*,u.name as unit_name,c.name as course_name,COUNT(a.id) as attendance_count FROM sessions s JOIN units u ON u.id=s.unit_id JOIN courses c ON c.id=u.course_id LEFT JOIN attendance a ON a.session_id=s.id WHERE s.is_active=1 GROUP BY s.id'
      )
      return res.json({ sessions })
    }
    res.json({ sessions: mock.sessions.filter(s => s.is_active).map(enrichSession) })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/sessions/lecturer
router.get('/lecturer', authenticate, requireRole('lecturer'), async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [today] = await db.query(
        'SELECT s.*,u.name as unit_name,c.name as course_name,COUNT(a.id) as attendance_count FROM sessions s JOIN units u ON u.id=s.unit_id JOIN courses c ON c.id=u.course_id LEFT JOIN attendance a ON a.session_id=s.id WHERE s.lecturer_id=? AND DATE(s.started_at)=CURDATE() GROUP BY s.id ORDER BY s.started_at DESC',
        [req.user.id]
      )
      const [recent] = await db.query(
        'SELECT s.*,u.name as unit_name,c.name as course_name,COUNT(a.id) as attendance_count FROM sessions s JOIN units u ON u.id=s.unit_id JOIN courses c ON c.id=u.course_id LEFT JOIN attendance a ON a.session_id=s.id WHERE s.lecturer_id=? AND DATE(s.started_at)<CURDATE() GROUP BY s.id ORDER BY s.started_at DESC LIMIT 5',
        [req.user.id]
      )
      return res.json({ today_sessions: today, recent, stats: { sessions_today: today.length, total_students: 145, avg_attendance: 82 } })
    }
    const mySessions = mock.sessions.filter(s => s.lecturer_id === req.user.id)
    const today = mySessions.filter(s => new Date(s.started_at).toDateString() === new Date().toDateString())
    const recent = mySessions.filter(s => new Date(s.started_at).toDateString() !== new Date().toDateString()).slice(0, 5)
    const myUnitIds = mock.lecturerAssignments.filter(la => la.lecturer_id === req.user.id).map(la => la.unit_id)
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

// GET /api/sessions/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [[session]] = await db.query(
        'SELECT s.*,u.name as unit_name,u.code as unit_code,c.id as course_id,c.name as course_name FROM sessions s JOIN units u ON u.id=s.unit_id JOIN courses c ON c.id=u.course_id WHERE s.id=?',
        [req.params.id]
      )
      if (!session) return res.status(404).json({ message: 'Session not found' })
      return res.json({ session })
    }
    const session = mock.sessions.find(s => s.id === parseInt(req.params.id))
    if (!session) return res.status(404).json({ message: 'Session not found' })
    res.json({ session: enrichSession(session) })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/sessions/:id/regenerate-qr
router.post('/:id/regenerate-qr', authenticate, requireRole('lecturer'), async (req, res) => {
  try {
    const qr_token   = uuidv4()
    const qr_token_hash = hashToken(qr_token)
    if (isAvailable()) {
      const db = pool()
      const [[session]] = await db.query('SELECT * FROM sessions WHERE id=? AND lecturer_id=?', [req.params.id, req.user.id])
      if (!session) return res.status(404).json({ message: 'Session not found' })
      const expires_at = new Date(Date.now() + session.qr_expiry_seconds * 1000).toISOString()
      await db.query('UPDATE sessions SET qr_token=?,qr_token_hash=?,expires_at=? WHERE id=?', [qr_token, qr_token_hash, expires_at, req.params.id])
      return res.json({ qr_token, expires_at })
    }
    const session = mock.sessions.find(s => s.id === parseInt(req.params.id) && s.lecturer_id === req.user.id)
    if (!session) return res.status(404).json({ message: 'Session not found' })
    const expires_at = new Date(Date.now() + session.qr_expiry_seconds * 1000).toISOString()
    session.qr_token  = qr_token
    session.qr_token_hash = hashToken(qr_token)
    session.expires_at = expires_at
    res.json({ qr_token, expires_at })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/sessions/:id/end
router.put('/:id/end', authenticate, requireRole('lecturer'), async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query('UPDATE sessions SET is_active=0,ended_at=NOW() WHERE id=? AND lecturer_id=?', [req.params.id, req.user.id])
      return res.json({ message: 'Session ended' })
    }
    const session = mock.sessions.find(s => s.id === parseInt(req.params.id) && s.lecturer_id === req.user.id)
    if (session) { session.is_active = false; session.ended_at = new Date().toISOString() }
    res.json({ message: 'Session ended' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
