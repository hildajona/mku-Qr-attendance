const express  = require('express')
const bcrypt   = require('bcryptjs')
const multer   = require('multer')
const csv      = require('csv-parser')
const stream   = require('stream')
const { pool, isAvailable } = require('../config/db')
const mock     = require('../config/mockData')
const { authenticate, requireRole } = require('../middleware/auth')

const router  = express.Router()
const upload  = multer({ storage: multer.memoryStorage() })
const isAdmin = [authenticate, requireRole('admin')]

// ─── STATS ───────────────────────────────────────────────────────────────────
router.get('/stats', isAdmin, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [[{ students }]]       = await db.query("SELECT COUNT(*) as students FROM users WHERE role='student' AND is_active=1")
      const [[{ lecturers }]]      = await db.query("SELECT COUNT(*) as lecturers FROM users WHERE role='lecturer' AND is_active=1")
      const [[{ sessions_today }]] = await db.query("SELECT COUNT(*) as sessions_today FROM sessions WHERE DATE(started_at)=CURDATE()")
      return res.json({ students, lecturers, sessions_today, avg_attendance: 78 })
    }
    const students       = mock.users.filter(u => u.role === 'student' && u.is_active).length
    const lecturers      = mock.users.filter(u => u.role === 'lecturer' && u.is_active).length
    const sessions_today = mock.sessions.filter(s => {
      const d = new Date(s.started_at)
      const now = new Date()
      return d.toDateString() === now.toDateString()
    }).length
    res.json({ students, lecturers, sessions_today, avg_attendance: 78 })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── RECENT SESSIONS ─────────────────────────────────────────────────────────
router.get('/recent-sessions', isAdmin, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [sessions] = await db.query(`
        SELECT s.*, u.name as unit_name, c.name as course_name, COUNT(a.id) as attendance_count
        FROM sessions s JOIN units u ON u.id=s.unit_id JOIN courses c ON c.id=u.course_id
        LEFT JOIN attendance a ON a.session_id=s.id GROUP BY s.id ORDER BY s.started_at DESC LIMIT 10
      `)
      return res.json({ sessions, alerts: [], chart: [] })
    }
    const sessions = mock.sessions.map(s => {
      const unit   = mock.units.find(u => u.id === s.unit_id)
      const course = mock.courses.find(c => c.id === unit?.course_id)
      const count  = mock.attendance.filter(a => a.session_id === s.id).length
      return { ...s, unit_name: unit?.name, course_name: course?.name, attendance_count: count }
    })
    const chart = mock.units.slice(0, 5).map(u => ({
      unit_name: u.name,
      present: mock.attendance.filter(a => {
        const sess = mock.sessions.find(s => s.id === a.session_id)
        return sess?.unit_id === u.id && a.status === 'present'
      }).length,
      absent: 2,
    }))
    res.json({ sessions, alerts: [], chart })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── STUDENTS ────────────────────────────────────────────────────────────────
router.get('/students', isAdmin, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [students] = await db.query("SELECT id,name,email,reg_number,course,is_active,created_at FROM users WHERE role='student' ORDER BY name")
      return res.json({ students })
    }
    const students = mock.users
      .filter(u => u.role === 'student')
      .map(({ password_hash, ...u }) => u)
    res.json({ students })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/students', isAdmin, async (req, res) => {
  const { name, email, reg_number, password, course } = req.body
  if (!name || !reg_number) return res.status(400).json({ message: 'Name and reg number required' })
  try {
    const hash = await bcrypt.hash(password || 'student123', 10)
    if (isAvailable()) {
      const db = pool()
      const [result] = await db.query(
        'INSERT INTO users (name,email,password_hash,role,reg_number,course) VALUES (?,?,?,?,?,?)',
        [name, email || null, hash, 'student', reg_number, course || null]
      )
      return res.status(201).json({ id: result.insertId, message: 'Student created' })
    }
    if (mock.users.find(u => u.reg_number === reg_number)) {
      return res.status(409).json({ message: 'Registration number already exists' })
    }
    const id = mock.nextID('users')
    mock.users.push({ id, name, email: email || null, password_hash: hash, role: 'student', reg_number, course: course || null, is_active: true, created_at: new Date().toISOString() })
    res.status(201).json({ id, message: 'Student created' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/students/:id', isAdmin, async (req, res) => {
  const { name, email, reg_number, course, is_active } = req.body
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query(
        'UPDATE users SET name=COALESCE(?,name),email=COALESCE(?,email),reg_number=COALESCE(?,reg_number),course=COALESCE(?,course),is_active=COALESCE(?,is_active) WHERE id=? AND role=?',
        [name, email, reg_number, course, is_active, req.params.id, 'student']
      )
      return res.json({ message: 'Student updated' })
    }
    const u = mock.users.find(u => u.id === parseInt(req.params.id))
    if (u) {
      if (name !== undefined) u.name = name
      if (email !== undefined) u.email = email
      if (reg_number !== undefined) u.reg_number = reg_number
      if (course !== undefined) u.course = course
      if (is_active !== undefined) u.is_active = is_active
    }
    res.json({ message: 'Student updated' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/students/:id', isAdmin, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query("DELETE FROM users WHERE id=? AND role='student'", [req.params.id])
      return res.json({ message: 'Student deleted' })
    }
    const idx = mock.users.findIndex(u => u.id === parseInt(req.params.id) && u.role === 'student')
    if (idx !== -1) mock.users.splice(idx, 1)
    res.json({ message: 'Student deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/students/import', isAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
  const results = []
  const bufferStream = new stream.PassThrough()
  bufferStream.end(req.file.buffer)
  bufferStream.pipe(csv()).on('data', row => results.push(row)).on('end', async () => {
    let imported = 0
    for (const row of results) {
      try {
        const hash = await bcrypt.hash(row.password || 'student123', 10)
        if (isAvailable()) {
          const db = pool()
          await db.query('INSERT IGNORE INTO users (name,email,password_hash,role,reg_number,course) VALUES (?,?,?,?,?,?)',
            [row.name, row.email || null, hash, 'student', row.reg_number, row.course || null])
        } else {
          if (!mock.users.find(u => u.reg_number === row.reg_number)) {
            const id = mock.nextID('users')
            mock.users.push({ id, name: row.name, email: row.email || null, password_hash: hash, role: 'student', reg_number: row.reg_number, course: row.course || null, is_active: true, created_at: new Date().toISOString() })
          }
        }
        imported++
      } catch { /* skip */ }
    }
    res.json({ message: `Imported ${imported} students`, total: results.length, imported })
  }).on('error', () => res.status(400).json({ message: 'Invalid CSV format' }))
})

// ─── LECTURERS ───────────────────────────────────────────────────────────────
router.get('/lecturers', isAdmin, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [lecturers] = await db.query(`
        SELECT u.id,u.name,u.email,u.department,u.is_active, COUNT(la.id) as units_count
        FROM users u LEFT JOIN lecturer_assignments la ON la.lecturer_id=u.id
        WHERE u.role='lecturer' GROUP BY u.id ORDER BY u.name
      `)
      return res.json({ lecturers })
    }
    const lecturers = mock.users
      .filter(u => u.role === 'lecturer')
      .map(({ password_hash, ...u }) => ({
        ...u,
        units_count: mock.lecturerAssignments.filter(la => la.lecturer_id === u.id).length,
      }))
    res.json({ lecturers })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/lecturers', isAdmin, async (req, res) => {
  const { name, email, department, password } = req.body
  if (!name || !email) return res.status(400).json({ message: 'Name and email required' })
  try {
    const hash = await bcrypt.hash(password || 'lecturer123', 10)
    if (isAvailable()) {
      const db = pool()
      const [result] = await db.query('INSERT INTO users (name,email,password_hash,role,department) VALUES (?,?,?,?,?)',
        [name, email, hash, 'lecturer', department || null])
      return res.status(201).json({ id: result.insertId, message: 'Lecturer created' })
    }
    if (mock.users.find(u => u.email === email)) return res.status(409).json({ message: 'Email already exists' })
    const id = mock.nextID('users')
    mock.users.push({ id, name, email, password_hash: hash, role: 'lecturer', reg_number: null, course: null, department: department || null, is_active: true, created_at: new Date().toISOString() })
    res.status(201).json({ id, message: 'Lecturer created' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/lecturers/:id', isAdmin, async (req, res) => {
  const { name, email, department, is_active } = req.body
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query('UPDATE users SET name=COALESCE(?,name),email=COALESCE(?,email),department=COALESCE(?,department),is_active=COALESCE(?,is_active) WHERE id=? AND role=?',
        [name, email, department, is_active, req.params.id, 'lecturer'])
      return res.json({ message: 'Lecturer updated' })
    }
    const u = mock.users.find(u => u.id === parseInt(req.params.id))
    if (u) {
      if (name !== undefined) u.name = name
      if (email !== undefined) u.email = email
      if (department !== undefined) u.department = department
      if (is_active !== undefined) u.is_active = is_active
    }
    res.json({ message: 'Lecturer updated' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/lecturers/:id', isAdmin, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query("DELETE FROM users WHERE id=? AND role='lecturer'", [req.params.id])
      return res.json({ message: 'Lecturer deleted' })
    }
    const idx = mock.users.findIndex(u => u.id === parseInt(req.params.id) && u.role === 'lecturer')
    if (idx !== -1) mock.users.splice(idx, 1)
    res.json({ message: 'Lecturer deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/lecturers/:id/reset-password', isAdmin, async (req, res) => {
  try {
    const hash = await bcrypt.hash('lecturer123', 10)
    if (isAvailable()) {
      const db = pool()
      await db.query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.params.id])
    } else {
      const u = mock.users.find(u => u.id === parseInt(req.params.id))
      if (u) u.password_hash = hash
    }
    res.json({ message: 'Password reset to: lecturer123' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── SETTINGS ────────────────────────────────────────────────────────────────
router.get('/settings', isAdmin, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [rows] = await db.query('SELECT * FROM settings WHERE id=1')
      return res.json(rows[0] || mock.settings)
    }
    res.json(mock.settings)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/settings', isAdmin, async (req, res) => {
  const fields = req.body
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query(
        `INSERT INTO settings (id,university_name,qr_expiry_seconds,email_notifications,low_attendance_threshold,allow_late_marking,late_threshold_minutes)
         VALUES (1,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE
         university_name=VALUES(university_name),qr_expiry_seconds=VALUES(qr_expiry_seconds),
         email_notifications=VALUES(email_notifications),low_attendance_threshold=VALUES(low_attendance_threshold),
         allow_late_marking=VALUES(allow_late_marking),late_threshold_minutes=VALUES(late_threshold_minutes)`,
        [fields.university_name, fields.qr_expiry_seconds, fields.email_notifications, fields.low_attendance_threshold, fields.allow_late_marking, fields.late_threshold_minutes]
      )
      return res.json({ message: 'Settings saved' })
    }
    Object.assign(mock.settings, fields)
    res.json({ message: 'Settings saved' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
