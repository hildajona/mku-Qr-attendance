const express = require('express')
const rateLimit = require('express-rate-limit')
const crypto = require('crypto')
const { pool, isAvailable } = require('../config/db')
const mock    = require('../config/mockData')
const { authenticate, requireRole } = require('../middleware/auth')

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many scan attempts. Please try again in a minute.' },
})

const router = express.Router()

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// POST /api/attendance/mark
router.post('/mark', scanLimiter, authenticate, requireRole('student'), async (req, res) => {
  const { token, student_id, gps_lat, gps_lng, gps_accuracy } = req.body
  const sid = parseInt(student_id || req.user.id)
  if (!token) return res.status(400).json({ message: 'QR token is required' })

  const tokenHash = hashToken(token)
  const ipAddress = req.ip || req.connection?.remoteAddress || null
  const deviceInfo = req.headers['user-agent'] || null
  const gpsLat = gps_lat != null ? parseFloat(gps_lat) : null
  const gpsLng = gps_lng != null ? parseFloat(gps_lng) : null
  const accuracy = gps_accuracy != null ? parseFloat(gps_accuracy) : null

  try {
    if (isAvailable()) {
      const db = pool()
      const [[session]] = await db.query(
        'SELECT s.*,u.name as unit_name,u.id as unit_id FROM sessions s JOIN units u ON u.id=s.unit_id WHERE s.qr_token_hash=?',
        [tokenHash]
      )
      if (!session) return res.status(404).json({ message: 'Invalid QR code' })
      if (!session.is_active) return res.status(400).json({ message: 'This session has ended' })
      if (new Date(session.expires_at) < new Date()) return res.status(400).json({ message: 'QR code has expired. Ask your lecturer to refresh it.' })
      const [[enrollment]] = await db.query('SELECT id FROM enrollments WHERE student_id=? AND unit_id=?', [sid, session.unit_id])
      if (!enrollment) return res.status(403).json({ message: 'You are not enrolled in this unit' })
      const [[existing]] = await db.query('SELECT id FROM attendance WHERE session_id=? AND student_id=?', [session.id, sid])
      if (existing) return res.status(409).json({ message: 'Attendance already recorded for this session' })

      let distanceFromClass = null
      let effectiveRadius = null
      let potentialSpoof = false
      if (session.latitude != null && session.longitude != null) {
        if (gpsLat == null || gpsLng == null) {
          return res.status(400).json({ message: 'Location is required to verify attendance for this session. Please allow location access and try again.' })
        }
        distanceFromClass = haversine(parseFloat(session.latitude), parseFloat(session.longitude), gpsLat, gpsLng)
        effectiveRadius = session.radius_meters ? parseFloat(session.radius_meters) : 100
        if (accuracy != null && accuracy > 50) {
          effectiveRadius += accuracy
        }
        if (distanceFromClass > effectiveRadius) {
          return res.status(403).json({
            message: `You must be physically present in class. You are ${Math.round(distanceFromClass)}m away from the classroom location.`,
          })
        }
        if (accuracy != null && accuracy >= 0 && accuracy < 3) {
          potentialSpoof = true
        }
      }

      const [[settings]] = await db.query('SELECT late_threshold_minutes,allow_late_marking FROM settings WHERE id=1')
      const lateThreshold = settings?.late_threshold_minutes || 15
      const minutesSinceStart = (Date.now() - new Date(session.started_at)) / 60000
      const status = minutesSinceStart > lateThreshold ? 'late' : 'present'
      await db.query(
        'INSERT INTO attendance (session_id,student_id,status,ip_address,device_info,gps_lat,gps_lng,gps_accuracy,distance_from_class) VALUES (?,?,?,?,?,?,?,?,?)',
        [session.id, sid, status, ipAddress, deviceInfo, gpsLat, gpsLng, accuracy, distanceFromClass]
      )
      return res.json({
        message: status === 'late' ? 'Marked as late' : 'Attendance recorded!',
        status,
        unit_name: session.unit_name,
        session_id: session.id,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        gps_accuracy: accuracy,
        distance_from_class: distanceFromClass,
        potential_spoof: potentialSpoof,
      })
    }

    // Mock
    const mockHash = hashToken(token)
    const session = mock.sessions.find(s => s.qr_token === token || s.qr_token_hash === mockHash)
    if (!session) return res.status(404).json({ message: 'Invalid QR code' })
    if (!session.is_active) return res.status(400).json({ message: 'This session has ended' })
    if (new Date(session.expires_at) < new Date()) return res.status(400).json({ message: 'QR code has expired. Ask your lecturer to refresh it.' })
    const enrollment = mock.enrollments.find(e => e.student_id === sid && e.unit_id === session.unit_id)
    if (!enrollment) return res.status(403).json({ message: 'You are not enrolled in this unit' })
    const existing = mock.attendance.find(a => a.session_id === session.id && a.student_id === sid)
    if (existing) return res.status(409).json({ message: 'Attendance already recorded for this session' })
    const lateThreshold = mock.settings.late_threshold_minutes || 15
    const minutesSinceStart = (Date.now() - new Date(session.started_at)) / 60000
    const status = minutesSinceStart > lateThreshold ? 'late' : 'present'

    let distanceFromClass = null
    let effectiveRadius = null
    let potentialSpoof = false
    if (session.latitude != null && session.longitude != null) {
      if (gpsLat == null || gpsLng == null) {
        return res.status(400).json({ message: 'Location is required to verify attendance for this session. Please allow location access and try again.' })
      }
      distanceFromClass = haversine(session.latitude, session.longitude, gpsLat, gpsLng)
      effectiveRadius = session.radius_meters || 100
      if (accuracy != null && accuracy > 50) {
        effectiveRadius += accuracy
      }
      if (distanceFromClass > effectiveRadius) {
        return res.status(403).json({
          message: `You must be physically present in class. You are ${Math.round(distanceFromClass)}m away from the classroom location.`,
        })
      }
      if (accuracy != null && accuracy >= 0 && accuracy < 3) {
        potentialSpoof = true
      }
    }

    const id = mock.nextID('attendance')
    mock.attendance.push({
      id,
      session_id: session.id,
      student_id: sid,
      scanned_at: new Date().toISOString(),
      status,
      ip_address: ipAddress,
      device_info: deviceInfo,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      gps_accuracy: accuracy,
      distance_from_class: distanceFromClass,
    })
    const unit = mock.units.find(u => u.id === session.unit_id)
    res.json({
      message: status === 'late' ? 'Marked as late' : 'Attendance recorded!',
      status,
      unit_name: unit?.name,
      session_id: session.id,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      gps_accuracy: accuracy,
      distance_from_class: distanceFromClass,
      potential_spoof: potentialSpoof,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/attendance/session/:id
router.get('/session/:id', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [records] = await db.query(
        'SELECT a.*,u.name as student_name,u.reg_number FROM attendance a JOIN users u ON u.id=a.student_id WHERE a.session_id=? ORDER BY a.scanned_at DESC',
        [req.params.id]
      )
      return res.json({ records })
    }
    const records = mock.attendance
      .filter(a => a.session_id === parseInt(req.params.id))
      .map(a => {
        const user = mock.users.find(u => u.id === a.student_id)
        return { ...a, student_name: user?.name, reg_number: user?.reg_number }
      })
      .sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at))
    res.json({ records })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/attendance/session/:id/absent
router.post('/session/:id/absent', authenticate, requireRole('lecturer'), async (req, res) => {
  const { student_id } = req.body
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query("INSERT INTO attendance (session_id,student_id,status) VALUES (?,?,'absent') ON DUPLICATE KEY UPDATE status='absent'", [req.params.id, student_id])
      return res.json({ message: 'Marked absent' })
    }
    const existing = mock.attendance.find(a => a.session_id === parseInt(req.params.id) && a.student_id === parseInt(student_id))
    if (existing) { existing.status = 'absent' }
    else {
      const id = mock.nextID('attendance')
      mock.attendance.push({ id, session_id: parseInt(req.params.id), student_id: parseInt(student_id), scanned_at: new Date().toISOString(), status: 'absent' })
    }
    res.json({ message: 'Marked absent' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/attendance/student/:id
router.get('/student/:id', authenticate, async (req, res) => {
  const targetId = req.params.id === 'me' ? req.user.id : parseInt(req.params.id)
  if (req.user.role === 'student' && req.user.id !== targetId) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  try {
    if (isAvailable()) {
      const db = pool()
      const [records] = await db.query(
        'SELECT a.*,u2.name as unit_name,u2.code as unit_code,DATE(s.started_at) as date FROM attendance a JOIN sessions s ON s.id=a.session_id JOIN units u2 ON u2.id=s.unit_id WHERE a.student_id=? ORDER BY s.started_at DESC',
        [targetId]
      )
      const [units] = await db.query(
        'SELECT u.id,u.name,u.code,COUNT(s.id) as total,SUM(CASE WHEN a.status IN (\'present\',\'late\') THEN 1 ELSE 0 END) as attended,ROUND(SUM(CASE WHEN a.status IN (\'present\',\'late\') THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(s.id),0),1) as percentage FROM enrollments e JOIN units u ON u.id=e.unit_id LEFT JOIN sessions s ON s.unit_id=u.id LEFT JOIN attendance a ON a.session_id=s.id AND a.student_id=e.student_id WHERE e.student_id=? GROUP BY u.id',
        [targetId]
      )
      const overall = units.length ? Math.round(units.reduce((s, u) => s + (u.percentage || 0), 0) / units.length) : 0
      return res.json({ records, units, overall })
    }

    // Mock
    const myEnrollments = mock.enrollments.filter(e => e.student_id === targetId)
    const records = mock.attendance
      .filter(a => a.student_id === targetId)
      .map(a => {
        const session = mock.sessions.find(s => s.id === a.session_id)
        const unit    = mock.units.find(u => u.id === session?.unit_id)
        return { ...a, unit_name: unit?.name, unit_code: unit?.code, date: session ? session.started_at.split('T')[0] : null }
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    const units = myEnrollments.map(e => {
      const unit     = mock.units.find(u => u.id === e.unit_id)
      const sessions = mock.sessions.filter(s => s.unit_id === e.unit_id)
      const total    = sessions.length
      const attended = mock.attendance.filter(a => a.student_id === targetId && sessions.find(s => s.id === a.session_id) && ['present','late'].includes(a.status)).length
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0
      return { id: unit?.id, name: unit?.name, code: unit?.code, total, attended, percentage }
    })

    const overall = units.length ? Math.round(units.reduce((s, u) => s + u.percentage, 0) / units.length) : 0
    res.json({ records, units, overall })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/attendance/report
router.get('/report', authenticate, async (req, res) => {
  const { course, unit, student, date_from, date_to, unit_id } = req.query
  try {
    if (isAvailable()) {
      const db = pool()
      let query = `SELECT a.id,u.name as student_name,u.reg_number,un.name as unit_name,un.code as unit_code,c.name as course_name,DATE(s.started_at) as date,TIME(a.scanned_at) as time,a.status FROM attendance a JOIN users u ON u.id=a.student_id JOIN sessions s ON s.id=a.session_id JOIN units un ON un.id=s.unit_id JOIN courses c ON c.id=un.course_id WHERE 1=1`
      const params = []
      if (unit_id) { query += ' AND un.id=?'; params.push(unit_id) }
      if (unit)    { query += ' AND un.name LIKE ?'; params.push(`%${unit}%`) }
      if (course)  { query += ' AND c.name LIKE ?'; params.push(`%${course}%`) }
      if (student) { query += ' AND (u.name LIKE ? OR u.reg_number LIKE ?)'; params.push(`%${student}%`, `%${student}%`) }
      if (date_from) { query += ' AND DATE(s.started_at) >= ?'; params.push(date_from) }
      if (date_to)   { query += ' AND DATE(s.started_at) <= ?'; params.push(date_to) }
      if (req.user.role === 'lecturer') { query += ' AND s.lecturer_id=?'; params.push(req.user.id) }
      query += ' ORDER BY s.started_at DESC LIMIT 1000'
      const [records] = await db.query(query, params)
      return res.json({ records })
    }

    // Mock
    let records = mock.attendance.map(a => {
      const student = mock.users.find(u => u.id === a.student_id)
      const session = mock.sessions.find(s => s.id === a.session_id)
      const unitObj = mock.units.find(u => u.id === session?.unit_id)
      const courseObj = mock.courses.find(c => c.id === unitObj?.course_id)
      return {
        id: a.id,
        student_name: student?.name,
        reg_number: student?.reg_number,
        unit_name: unitObj?.name,
        unit_code: unitObj?.code,
        course_name: courseObj?.name,
        date: session ? session.started_at.split('T')[0] : null,
        time: a.scanned_at ? a.scanned_at.split('T')[1]?.substring(0, 8) : null,
        status: a.status,
      }
    })

    if (req.user.role === 'lecturer') {
      const mySessionIds = mock.sessions.filter(s => s.lecturer_id === req.user.id).map(s => s.id)
      records = records.filter(r => mySessionIds.includes(mock.attendance.find(a => a.id === r.id)?.session_id))
    }
    if (unit_id) records = records.filter(r => mock.units.find(u => u.name === r.unit_name)?.id === parseInt(unit_id))
    if (unit)    records = records.filter(r => r.unit_name?.toLowerCase().includes(unit.toLowerCase()))
    if (course)  records = records.filter(r => r.course_name?.toLowerCase().includes(course.toLowerCase()))
    if (student) records = records.filter(r => r.student_name?.toLowerCase().includes(student.toLowerCase()) || r.reg_number?.includes(student))
    if (date_from) records = records.filter(r => r.date >= date_from)
    if (date_to)   records = records.filter(r => r.date <= date_to)

    res.json({ records })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
