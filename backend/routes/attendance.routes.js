const express = require('express')
const rateLimit = require('express-rate-limit')
const { pool, isAvailable } = require('../config/db')
const redis   = require('../config/redis')
const mock    = require('../config/mockData')
const { verifyQRToken } = require('../utils/qrToken')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()
const MAX_SCAN_ATTEMPTS = parseInt(process.env.SCAN_RATE_LIMIT_MAX) || 3

// Per-IP rate limiter for the check-in endpoint (handles 500 concurrent peak)
const checkInLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1 minute
  max: 10,                // 10 attempts per IP per minute
  keyGenerator: (req) => req.ip + ':' + (req.body?.student_id || req.user?.id || ''),
  message: { message: 'Too many scan attempts. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ── POST /api/attendance/check-in  (was /mark) ────────────────────────────
router.post('/check-in', checkInLimiter, authenticate, requireRole('student'), async (req, res) => {
  const { token, student_id, device_fingerprint, lat, lng } = req.body
  const sid = student_id || req.user.id

  if (!token) return res.status(400).json({ message: 'QR token is required' })

  // ── Step 1: Verify JWT signature + expiry ──────────────────────────────
  const { decoded, error } = verifyQRToken(token)
  if (error) {
    if (error === 'expired') {
      return res.status(400).json({ message: 'QR code has expired. Ask your lecturer to refresh it.' })
    }
    return res.status(400).json({ message: 'This QR code is invalid. Ask your lecturer to refresh it.' })
  }
  const sessionId = decoded.sid

  try {
    // ── Step 2: Redis fast-path — check token is still active ──────────
    const cachedSession = await redis.getTokenSession(token)
    // If Redis says it's gone (lecturer regenerated), reject immediately
    if (redis.isAvailable() && cachedSession === null) {
      return res.status(400).json({ message: 'This QR code has been replaced. Scan the new one.' })
    }

    // ── Step 3: Per-student rate limiting (max 3 attempts) ─────────────
    const attempts = await redis.getScanAttempts(sid, sessionId)
    if (attempts >= MAX_SCAN_ATTEMPTS) {
      return res.status(429).json({ message: `Maximum scan attempts (${MAX_SCAN_ATTEMPTS}) reached for this session.` })
    }
    await redis.incrementScanAttempts(sid, sessionId)

    if (isAvailable()) {
      const db = pool()

      // ── Step 4a: DB — validate session ──────────────────────────────
      const [[session]] = await db.query(
        `SELECT s.*, u.name as unit_name, u.id as unit_id,
                se.late_threshold_minutes, se.allow_late_marking, se.max_scan_attempts,
                se.geo_check_enabled,
                se.institution_lat, se.institution_lng, se.institution_radius_meters
         FROM sessions s
         JOIN units u ON u.id=s.unit_id
         LEFT JOIN settings se ON se.id=1
         WHERE s.qr_token=? LIMIT 1`, [token]
      )
      if (!session) return res.status(404).json({ message: 'Session not found for this QR code.' })
      if (!session.is_active) return res.status(400).json({ message: 'This session has ended.' })
      if (new Date(session.expires_at) < new Date()) {
        return res.status(400).json({ message: 'QR code has expired. Ask your lecturer to refresh it.' })
      }

      // ── Geolocation Check ───────────────────────────────────────────
      // Only enforce geo when explicitly enabled (=1). null / 0 = geo off.
      const geoCheckEnabled = session.geo_check_enabled === 1

      // Determine which coordinates to use:
      // Priority 1 — session/venue-specific coordinates
      // Priority 2 — institution-wide location set by admin in Settings
      let geoLat = session.lat
      let geoLng = session.lng
      let geoRadius = session.radius_meters || 100
      let usingInstitutionLocation = false

      if ((geoLat === null || geoLng === null) && session.institution_lat && session.institution_lng) {
        geoLat = session.institution_lat
        geoLng = session.institution_lng
        geoRadius = session.institution_radius_meters || 200
        usingInstitutionLocation = true
      }

      if (geoCheckEnabled && geoLat !== null && geoLng !== null) {
        if (lat === null || lng === null || lat === undefined || lng === undefined) {
          return res.status(400).json({ message: 'Location access is required to check in for this session. Please enable GPS.' })
        }

        // Haversine formula
        const R = 6371e3; // Earth's radius in meters
        const phi1 = parseFloat(geoLat) * Math.PI / 180
        const phi2 = parseFloat(lat) * Math.PI / 180
        const deltaPhi = (parseFloat(lat) - parseFloat(geoLat)) * Math.PI / 180
        const deltaLambda = (parseFloat(lng) - parseFloat(geoLng)) * Math.PI / 180

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c // distance in meters

        if (distance > geoRadius) {
          const locationLabel = usingInstitutionLocation ? 'institution campus' : 'venue'
          return res.status(400).json({
            message: `You are not within the required ${locationLabel} location. Detected distance: ${Math.round(distance)}m (allowed radius: ${geoRadius}m).`
          })
        }
      }

      // ── Step 4b: Enrollment check ───────────────────────────────────
      const [[enrolled]] = await db.query(
        'SELECT id FROM enrollments WHERE student_id=? AND unit_id=?', [sid, session.unit_id]
      )
      if (!enrolled) return res.status(403).json({ message: 'You are not enrolled in this unit.' })

      // ── Step 4c: Late status ─────────────────────────────────────────
      const lateThresh  = session.late_threshold_minutes || 15
      const allowLate   = session.allow_late_marking !== 0
      const minsSinceStart = (Date.now() - new Date(session.started_at)) / 60000
      let status = 'present'
      if (minsSinceStart > lateThresh) {
        if (!allowLate) return res.status(400).json({ message: 'Late arrivals are not accepted for this session.' })
        status = 'late'
      }

      // ── Step 4d: Atomic INSERT ───────────────────────────────────────────
      try {
        await db.query(
          `INSERT INTO attendance (session_id, student_id, status, device_fingerprint, ip_address, lat, lng)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [session.id, sid, status, device_fingerprint || null, req.ip, lat || null, lng || null]
        )
        await redis.invalidateCount(session.id)
        const [[student]] = await db.query('SELECT name, reg_number FROM users WHERE id=?', [sid])
        // Emit real-time update to all clients watching this session
        const io = req.app.get('io')
        if (io) {
          io.to(`session:${session.id}`).emit('attendance_update', {
            student_name: student?.name,
            reg_number: student?.reg_number,
            status,
            scanned_at: new Date().toISOString(),
          })
        }
        return res.json({ message: status === 'late' ? 'Marked as late' : 'Attendance recorded!', status, unit_name: session.unit_name, student_name: student?.name })
      } catch (dbErr) {
        if (dbErr.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Attendance already recorded for this session.' })
        }
        throw dbErr
      }
    }

    // ── Mock path ─────────────────────────────────────────────────────
    const session = mock.sessions.find(s => s.qr_token === token)
    if (!session) return res.status(404).json({ message: 'Session not found for this QR code.' })
    if (!session.is_active) return res.status(400).json({ message: 'This session has ended.' })
    if (new Date(session.expires_at) < new Date()) return res.status(400).json({ message: 'QR code has expired.' })

    // ── Mock Geolocation Check ─────────────────────────────────────────
    // Only enforce geo when explicitly enabled (true/1). false/null/0 = off.
    const geoCheckEnabled = (mock.settings && (mock.settings.geo_check_enabled === true || mock.settings.geo_check_enabled === 1));
    if (geoCheckEnabled && session.lat !== undefined && session.lat !== null && session.lng !== undefined && session.lng !== null) {
      if (lat === null || lng === null || lat === undefined || lng === undefined) {
        return res.status(400).json({ message: 'Location access is required to check in for this session. Please enable GPS.' })
      }
      
      const R = 6371e3; // Earth's radius in meters
      const phi1 = session.lat * Math.PI / 180;
      const phi2 = lat * Math.PI / 180;
      const deltaPhi = (lat - session.lat) * Math.PI / 180;
      const deltaLambda = (lng - session.lng) * Math.PI / 180;

      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      const allowedRadius = session.radius_meters || 50;
      if (distance > allowedRadius) {
        return res.status(400).json({
          message: `You are not within the required venue location. Detected distance: ${Math.round(distance)}m (allowed radius: ${allowedRadius}m).`
        })
      }
    }
    const enrolled = mock.enrollments.find(e => String(e.student_id) === String(sid) && e.unit_id === session.unit_id)
    if (!enrolled) return res.status(403).json({ message: 'You are not enrolled in this unit.' })
    const existing = mock.attendance.find(a => String(a.session_id) === String(session.id) && String(a.student_id) === String(sid))
    if (existing) return res.status(409).json({ message: 'Attendance already recorded for this session.' })
    const lateThresh = mock.settings.late_threshold_minutes || 15
    const minsSince  = (Date.now() - new Date(session.started_at)) / 60000
    const status     = minsSince > lateThresh ? 'late' : 'present'
    const id = mock.nextID('attendance')
    mock.attendance.push({ id, session_id: session.id, student_id: sid, scanned_at: new Date().toISOString(), status, device_fingerprint: device_fingerprint || null })
    await redis.invalidateCount(session.id)
    const unit    = mock.units.find(u => u.id === session.unit_id)
    const student = mock.users.find(u => u.id === sid)
    const io = req.app.get('io')
    if (io) io.to(`session:${session.id}`).emit('attendance_update', { student_name: student?.name, reg_number: student?.reg_number, status, scanned_at: new Date().toISOString() })
    res.json({ message: status === 'late' ? 'Marked as late' : 'Attendance recorded!', status, unit_name: unit?.name, student_name: student?.name })
  } catch (err) {
    console.error('[attendance] check-in error:', err.message)
    res.status(500).json({ message: 'Server error during attendance recording.' })
  }
})

// ── POST /api/attendance/computer  (campus browser marking via rotating code) ──
router.post('/computer', authenticate, requireRole('student'), async (req, res) => {
  const { code } = req.body
  const sid = req.user.id

  if (!code || code.trim().length !== 6) {
    return res.status(400).json({ message: 'A valid 6-character class code is required.' })
  }
  const upperCode = code.trim().toUpperCase()

  try {
    if (isAvailable()) {
      const db = pool()
      // Find an active session whose rotating_code matches
      const [[session]] = await db.query(
        `SELECT s.*, u.name as unit_name, u.id as unit_id
         FROM sessions s JOIN units u ON u.id=s.unit_id
         WHERE s.rotating_code=? AND s.is_active=1 LIMIT 1`,
        [upperCode]
      )
      if (!session) {
        return res.status(404).json({ message: 'No active session found for that code. Check the code and try again.' })
      }
      // Enrollment check
      const [[enrolled]] = await db.query(
        'SELECT id FROM enrollments WHERE student_id=? AND unit_id=?', [sid, session.unit_id]
      )
      if (!enrolled) {
        return res.status(403).json({ message: 'You are not enrolled in this unit.' })
      }
      // Late check
      const lateThresh = 15
      const minsSinceStart = (Date.now() - new Date(session.started_at)) / 60000
      const status = minsSinceStart > lateThresh ? 'late' : 'present'
      try {
        await db.query(
          `INSERT INTO attendance (session_id, student_id, status, ip_address, attendance_method)
           VALUES (?,?,?,?,'computer')`,
          [session.id, sid, status, req.ip]
        )
      } catch (dbErr) {
        if (dbErr.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Attendance already recorded for this session.' })
        }
        throw dbErr
      }
      const io = req.app.get('io')
      const [[student]] = await db.query('SELECT full_name as name, s2.student_reg_no as reg_number FROM users u LEFT JOIN students s2 ON s2.user_id=u.id WHERE u.id=?', [sid])
      if (io) {
        io.to(`session:${session.id}`).emit('attendance_update', {
          student_name: student?.name, reg_number: student?.reg_number,
          status, scanned_at: new Date().toISOString(),
        })
      }
      return res.json({
        message: status === 'late' ? 'Marked as late via campus browser' : 'Attendance recorded via campus browser!',
        status, unit_name: session.unit_name,
      })
    }

    // Mock path
    const session = mock.sessions.find(s => s.rotating_code === upperCode && s.is_active)
    if (!session) return res.status(404).json({ message: 'No active session found for that code.' })
    const enrolled = mock.enrollments.find(e => e.student_id === sid && e.unit_id === session.unit_id)
    if (!enrolled) return res.status(403).json({ message: 'You are not enrolled in this unit.' })
    const existing = mock.attendance.find(a => a.session_id === session.id && a.student_id === sid)
    if (existing) return res.status(409).json({ message: 'Attendance already recorded for this session.' })
    const minsSince = (Date.now() - new Date(session.started_at)) / 60000
    const status = minsSince > 15 ? 'late' : 'present'
    mock.attendance.push({
      id: mock.nextID('attendance'), session_id: session.id, student_id: sid,
      scanned_at: new Date().toISOString(), status, attendance_method: 'computer'
    })
    const unit = mock.units.find(u => u.id === session.unit_id)
    res.json({ message: 'Attendance recorded via campus browser!', status, unit_name: unit?.name })
  } catch (err) {
    console.error('[attendance] computer error:', err.message)
    res.status(500).json({ message: 'Server error during computer attendance.' })
  }
})

// ── POST /api/attendance/session/:id/manual  (lecturer manual override) ───────
router.post('/session/:id/manual', authenticate, requireRole('lecturer'), async (req, res) => {
  const { student_id, reason } = req.body
  if (!student_id) return res.status(400).json({ message: 'student_id is required' })
  if (!reason || !reason.trim()) return res.status(400).json({ message: 'A reason is required for manual override' })
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query(
        `INSERT INTO attendance (session_id, student_id, status, attendance_method, override_reason)
         VALUES (?,?,'present','manual',?)
         ON DUPLICATE KEY UPDATE status='present', attendance_method='manual', override_reason=?`,
        [req.params.id, student_id, reason.trim(), reason.trim()]
      )
      return res.json({ message: 'Student manually marked as present' })
    }
    const ex = mock.attendance.find(a => String(a.session_id) === String(req.params.id) && String(a.student_id) === String(student_id))
    if (ex) { ex.status = 'present'; ex.attendance_method = 'manual' }
    else {
      mock.attendance.push({
        id: mock.nextID('attendance'), session_id: String(req.params.id),
        student_id: String(student_id), scanned_at: new Date().toISOString(),
        status: 'present', attendance_method: 'manual'
      })
    }
    res.json({ message: 'Student manually marked as present' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── /mark → /check-in backwards compat ──────────────────────────────────
router.post('/mark', checkInLimiter, authenticate, requireRole('student'), async (req, res) => {
  // Forward to check-in handler by reusing the same logic inline
  req.url = '/check-in'
  const checkInHandler = router.stack.find(l => l.route && l.route.path === '/check-in')
  if (checkInHandler) {
    return checkInHandler.route.dispatch(req, res, () => {})
  }
  res.status(404).json({ message: 'Endpoint not found' })
})

// ── GET /api/attendance/session/:id ───────────────────────────────────────
router.get('/session/:id', authenticate, async (req, res) => {
  const page  = parseInt(req.query.page)  || 1
  const limit = parseInt(req.query.limit) || 100
  const offset = (page - 1) * limit
  try {
    if (isAvailable()) {
      const db = pool()
      const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM attendance WHERE session_id=?', [req.params.id])
      const [records] = await db.query(
        `SELECT a.id, a.student_id, a.scanned_at, a.status, a.device_fingerprint,
                u.name as student_name, u.reg_number
         FROM attendance a JOIN users u ON u.id=a.student_id
         WHERE a.session_id=? ORDER BY a.scanned_at DESC LIMIT ? OFFSET ?`,
        [req.params.id, limit, offset]
      )
      return res.json({ records, total, page, pages: Math.ceil(total / limit) })
    }
    const all = mock.attendance
      .filter(a => String(a.session_id) === String(req.params.id))
      .map(a => {
        const user = mock.users.find(u => u.id === a.student_id)
        return { ...a, student_name: user?.name, reg_number: user?.reg_number }
      })
      .sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at))
    const paginated = all.slice(offset, offset + limit)
    res.json({ records: paginated, total: all.length, page, pages: Math.ceil(all.length / limit) })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/attendance/session/:id/absent ───────────────────────────────
router.post('/session/:id/absent', authenticate, requireRole('lecturer'), async (req, res) => {
  const { student_id } = req.body
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query(
        `INSERT INTO attendance (session_id, student_id, status)
         VALUES (?,?,'absent')
         ON DUPLICATE KEY UPDATE status='absent'`, [req.params.id, student_id]
      )
      return res.json({ message: 'Marked absent' })
    }
    const ex = mock.attendance.find(a => String(a.session_id) === String(req.params.id) && String(a.student_id) === String(student_id))
    if (ex) { ex.status = 'absent' }
    else { mock.attendance.push({ id: mock.nextID('attendance'), session_id: String(req.params.id), student_id: String(student_id), scanned_at: new Date().toISOString(), status: 'absent' }) }
    res.json({ message: 'Marked absent' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/attendance/student/:id ──────────────────────────────────────
router.get('/student/:id', authenticate, async (req, res) => {
  const targetId = req.params.id === 'me' ? req.user.id : req.params.id
  if (req.user.role === 'student' && String(req.user.id) !== String(targetId)) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  try {
    if (isAvailable()) {
      const db = pool()
      const [records] = await db.query(
        `SELECT a.*, un.name as unit_name, un.code as unit_code, DATE(s.started_at) as date
         FROM attendance a
         JOIN sessions s ON s.id=a.session_id
         JOIN units un ON un.id=s.unit_id
         WHERE a.student_id=? ORDER BY s.started_at DESC`, [targetId]
      )
      const [units] = await db.query(
        `SELECT un.id, un.name, un.code,
                COUNT(s.id) as total,
                SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended,
                ROUND(SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(s.id),0),1) as percentage
         FROM enrollments e
         JOIN units un ON un.id=e.unit_id
         LEFT JOIN sessions s ON s.unit_id=un.id
         LEFT JOIN attendance a ON a.session_id=s.id AND a.student_id=e.student_id
         WHERE e.student_id=?
         GROUP BY un.id`, [targetId]
      )
      const overall = units.length ? Math.round(units.reduce((s, u) => s + (u.percentage || 0), 0) / units.length) : 0
      return res.json({ records, units, overall })
    }

    const myEnr  = mock.enrollments.filter(e => e.student_id === parseInt(targetId))
    const records = mock.attendance
      .filter(a => a.student_id === parseInt(targetId))
      .map(a => {
        const sess = mock.sessions.find(s => s.id === a.session_id)
        const unit = mock.units.find(u => u.id === sess?.unit_id)
        return { ...a, unit_name: unit?.name, unit_code: unit?.code, date: sess?.started_at?.split('T')[0] }
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
    const units = myEnr.map(e => {
      const unit  = mock.units.find(u => u.id === e.unit_id)
      const sess  = mock.sessions.filter(s => s.unit_id === e.unit_id)
      const total = sess.length
      const attended = mock.attendance.filter(a => a.student_id === parseInt(targetId) && sess.find(s => s.id === a.session_id) && ['present','late'].includes(a.status)).length
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0
      return { id: unit?.id, name: unit?.name, code: unit?.code, total, attended, percentage }
    })
    const overall = units.length ? Math.round(units.reduce((s, u) => s + u.percentage, 0) / units.length) : 0
    res.json({ records, units, overall })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/attendance/report ────────────────────────────────────────────
router.get('/report', authenticate, async (req, res) => {
  const { course, unit, student, date_from, date_to, unit_id, page = 1, limit = 500 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)
  try {
    if (isAvailable()) {
      const db = pool()
      let where  = 'WHERE 1=1'
      const params = []
      if (unit_id) { where += ' AND un.id=?';    params.push(unit_id) }
      if (unit)    { where += ' AND un.name LIKE ?'; params.push(`%${unit}%`) }
      if (course)  { where += ' AND c.name LIKE ?';  params.push(`%${course}%`) }
      if (student) { where += ' AND (u.name LIKE ? OR u.reg_number LIKE ?)'; params.push(`%${student}%`, `%${student}%`) }
      if (date_from) { where += ' AND DATE(s.started_at) >= ?'; params.push(date_from) }
      if (date_to)   { where += ' AND DATE(s.started_at) <= ?'; params.push(date_to) }
      if (req.user.role === 'lecturer') { where += ' AND s.lecturer_id=?'; params.push(req.user.id) }
      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) as total FROM attendance a JOIN users u ON u.id=a.student_id
         JOIN sessions s ON s.id=a.session_id JOIN units un ON un.id=s.unit_id
         JOIN courses c ON c.id=un.course_id ${where}`, params
      )
      const [records] = await db.query(
        `SELECT a.id, u.name as student_name, u.reg_number, un.name as unit_name,
                un.code as unit_code, c.name as course_name,
                DATE(s.started_at) as date, TIME(a.scanned_at) as time, a.status
         FROM attendance a JOIN users u ON u.id=a.student_id
         JOIN sessions s ON s.id=a.session_id JOIN units un ON un.id=s.unit_id
         JOIN courses c ON c.id=un.course_id
         ${where} ORDER BY s.started_at DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      )
      return res.json({ records, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
    }

    let records = mock.attendance.map(a => {
      const stu     = mock.users.find(u => u.id === a.student_id)
      const sess    = mock.sessions.find(s => s.id === a.session_id)
      const unitObj = mock.units.find(u => u.id === sess?.unit_id)
      const courseObj = mock.courses.find(c => c.id === unitObj?.course_id)
      return {
        id: a.id, student_name: stu?.name, reg_number: stu?.reg_number,
        unit_name: unitObj?.name, unit_code: unitObj?.code, course_name: courseObj?.name,
        date: sess?.started_at?.split('T')[0], time: a.scanned_at?.split('T')[1]?.substring(0,8),
        status: a.status,
      }
    })
    if (req.user.role === 'lecturer') {
      const myIds = mock.sessions.filter(s => s.lecturer_id === req.user.id).map(s => s.id)
      records = records.filter(r => myIds.includes(mock.attendance.find(a => a.id === r.id)?.session_id))
    }
    if (unit_id)   records = records.filter(r => String(mock.units.find(u => u.name === r.unit_name)?.id) === String(unit_id))
    if (unit)      records = records.filter(r => r.unit_name?.toLowerCase().includes(unit.toLowerCase()))
    if (course)    records = records.filter(r => r.course_name?.toLowerCase().includes(course.toLowerCase()))
    if (student)   records = records.filter(r => r.student_name?.toLowerCase().includes(student.toLowerCase()) || r.reg_number?.includes(student))
    if (date_from) records = records.filter(r => r.date >= date_from)
    if (date_to)   records = records.filter(r => r.date <= date_to)
    const total = records.length
    res.json({ records: records.slice(offset, offset + parseInt(limit)), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/attendance/export ────────────────────────────────────────────
router.get('/export', authenticate, async (req, res) => {
  const { session_id, unit_id, date_from, date_to, format = 'csv' } = req.query
  try {
    if (isAvailable()) {
      const db = pool()
      let where = 'WHERE 1=1'; const p = []
      if (session_id) { where += ' AND a.session_id=?'; p.push(session_id) }
      if (unit_id)    { where += ' AND un.id=?';         p.push(unit_id) }
      if (date_from)  { where += ' AND DATE(s.started_at)>=?'; p.push(date_from) }
      if (date_to)    { where += ' AND DATE(s.started_at)<=?'; p.push(date_to) }
      if (req.user.role === 'lecturer') { where += ' AND s.lecturer_id=?'; p.push(req.user.id) }
      const [rows] = await db.query(
        `SELECT u.reg_number, u.name as student_name, un.code as unit_code, un.name as unit_name,
                DATE(s.started_at) as date, TIME(a.scanned_at) as scan_time, a.status
         FROM attendance a JOIN users u ON u.id=a.student_id
         JOIN sessions s ON s.id=a.session_id JOIN units un ON un.id=s.unit_id
         ${where} ORDER BY s.started_at DESC, u.reg_number`, p
      )
      return sendExport(res, rows, format)
    }

    const rows = mock.attendance.map(a => {
      const stu  = mock.users.find(u => u.id === a.student_id)
      const sess = mock.sessions.find(s => s.id === a.session_id)
      const unit = mock.units.find(u => u.id === sess?.unit_id)
      return {
        reg_number: stu?.reg_number, student_name: stu?.name,
        unit_code: unit?.code, unit_name: unit?.name,
        date: sess?.started_at?.split('T')[0],
        scan_time: a.scanned_at?.split('T')[1]?.substring(0,8),
        status: a.status,
      }
    })
    sendExport(res, rows, format)
  } catch (err) {
    res.status(500).json({ message: 'Export failed' })
  }
})

function sendExport(res, rows, format) {
  if (format === 'excel') {
    // Simple TSV as .xlsx alternative without exceljs complexity
    const headers = Object.keys(rows[0] || {})
    const lines   = [headers.join('\t'), ...rows.map(r => headers.map(h => r[h] || '').join('\t'))]
    res.setHeader('Content-Type', 'application/vnd.ms-excel')
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.xls"')
    return res.send(lines.join('\n'))
  }
  // Default CSV
  const headers = ['reg_number', 'student_name', 'unit_code', 'unit_name', 'date', 'scan_time', 'status']
  const lines   = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(','))
  ]
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"')
  res.send(lines.join('\n'))
}

module.exports = router
