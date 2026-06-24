const express  = require('express')
const bcrypt   = require('bcryptjs')
const crypto   = require('crypto')
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
      const [students] = await db.query(`
        SELECT u.id, u.full_name as name, u.email, u.phone, u.status, u.has_smartphone,
               COALESCE(u.reg_number, s.student_reg_no) as reg_number, COALESCE(u.department, s.department) as department,
               COALESCE(u.course, s.programme) as course, s.year_of_study, s.semester,
               (SELECT GROUP_CONCAT(DISTINCT c.code SEPARATOR ', ')
                FROM enrollments e
                JOIN units uu ON uu.id = e.unit_id
                JOIN courses c ON c.id = uu.course_id
                WHERE e.student_id = u.id) as courses
        FROM users u 
        LEFT JOIN students s ON u.id = s.user_id 
        WHERE u.role='student' 
        ORDER BY u.full_name
      `)
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
  const { full_name, student_reg_no, phone, email, department, programme, year_of_study, semester, has_smartphone, courses, password } = req.body
  if (!full_name || !student_reg_no || !phone) return res.status(400).json({ message: 'Name, reg number, and phone required' })
  try {
    const hash = await bcrypt.hash(password || 'student123', 10)
    if (isAvailable()) {
      const db = pool()
      await db.query('START TRANSACTION')
      const userId = crypto.randomUUID()
      await db.query(
        'INSERT INTO users (id, full_name, email, phone, password_hash, role, status, has_smartphone, reg_number, course, department) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [userId, full_name, email || null, phone, hash, 'student', 'active', has_smartphone === false ? false : true, student_reg_no, programme || null, department || null]
      )
      await db.query(
        'INSERT INTO students (user_id, admission_number, student_reg_no, department, programme, year_of_study, semester) VALUES (?,?,?,?,?,?,?)',
        [userId, student_reg_no, student_reg_no, department || null, programme || null, parseInt(year_of_study) || 1, parseInt(semester) || 1]
      )

      if (courses && Array.isArray(courses)) {
        for (const item of courses) {
          if (!item) continue
          if (!isNaN(item)) {
            await db.query('INSERT IGNORE INTO enrollments (student_id, unit_id) VALUES (?,?)', [userId, parseInt(item, 10)])
          } else {
            const [courseRows] = await db.query('SELECT id FROM courses WHERE code = ? OR name = ? LIMIT 1', [item.trim(), item.trim()])
            if (courseRows.length > 0) {
              const [units] = await db.query('SELECT id FROM units WHERE course_id = ?', [courseRows[0].id])
              for (const unit of units) {
                await db.query('INSERT IGNORE INTO enrollments (student_id, unit_id) VALUES (?,?)', [userId, unit.id])
              }
            }
          }
        }
      }

      await db.query('COMMIT')
      return res.status(201).json({ id: userId, message: 'Student created successfully' })
    }
    res.status(201).json({ id: 999, message: 'Student created (Mock)' })
  } catch (err) {
    if (isAvailable()) await pool().query('ROLLBACK')
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.put('/students/:id', isAdmin, async (req, res) => {
  const { 
    full_name, name, email, phone, student_reg_no, reg_number,
    department, programme, course, year_of_study, semester, 
    has_smartphone, preferred_attendance_method, attendance_method,
    is_active, status
  } = req.body

  const studentId = req.params.id

  try {
    if (isAvailable()) {
      const db = pool()
      await db.query('START TRANSACTION')
      try {
        const finalName = full_name !== undefined ? full_name : name
        const finalRegNo = student_reg_no !== undefined ? student_reg_no : reg_number
        const finalHasSmartphone = has_smartphone !== undefined ? (has_smartphone === true || has_smartphone === 'true' || has_smartphone === 1 ? 1 : 0) : undefined
        const finalPrefMethod = preferred_attendance_method !== undefined ? preferred_attendance_method : attendance_method
        const finalCourse = programme !== undefined ? programme : course
        const finalStatus = is_active !== undefined
          ? ((is_active === true || is_active === 'true' || is_active === 1) ? 'active' : 'suspended')
          : status

        await db.query(
          `UPDATE users SET 
            full_name = COALESCE(?, full_name),
            email = COALESCE(?, email),
            phone = COALESCE(?, phone),
            has_smartphone = COALESCE(?, has_smartphone),
            preferred_attendance_method = COALESCE(?, preferred_attendance_method),
            status = COALESCE(?, status),
            reg_number = COALESCE(?, reg_number),
            course = COALESCE(?, course),
            department = COALESCE(?, department)
           WHERE id = ? AND role = 'student'`,
          [finalName, email, phone, finalHasSmartphone, finalPrefMethod, finalStatus, finalRegNo, finalCourse, department, studentId]
        )

        await db.query(
          `UPDATE students SET
            student_reg_no = COALESCE(?, student_reg_no),
            department = COALESCE(?, department),
            programme = COALESCE(?, programme),
            year_of_study = COALESCE(?, year_of_study),
            semester = COALESCE(?, semester)
           WHERE user_id = ?`,
          [finalRegNo, department, programme, year_of_study, semester, studentId]
        )

        await db.query('COMMIT')
        return res.json({ message: 'Student updated successfully' })
      } catch (err) {
        await db.query('ROLLBACK')
        throw err
      }
    }
    
    const u = mock.users.find(u => u.id === parseInt(studentId))
    if (u) {
      if (name !== undefined) u.name = name
      if (full_name !== undefined) u.full_name = full_name
      if (email !== undefined) u.email = email
      if (phone !== undefined) u.phone = phone
      if (reg_number !== undefined) u.reg_number = reg_number
      if (student_reg_no !== undefined) u.student_reg_no = student_reg_no
      if (has_smartphone !== undefined) u.has_smartphone = (has_smartphone === true || has_smartphone === 'true')
      if (preferred_attendance_method !== undefined) u.preferred_attendance_method = preferred_attendance_method
      if (is_active !== undefined) {
        u.is_active = (is_active === true || is_active === 'true')
        u.status = u.is_active ? 'active' : 'suspended'
      }
    }
    res.json({ message: 'Student updated (Mock)' })
  } catch (err) {
    console.error('Update student error:', err)
    res.status(500).json({ message: err.message || 'Server error' })
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
    let skipped = 0
    let errors = []

    for (let i = 0; i < results.length; i++) {
      const row = results[i]
      const rowNum = i + 1
      try {
        if (!row.full_name || !row.student_reg_no || !row.phone) {
          errors.push({ row: rowNum, reason: "Missing required fields (full_name, student_reg_no, phone)" })
          skipped++
          continue
        }

        const hash = await bcrypt.hash(row.password || 'student123', 10)
        if (isAvailable()) {
          const db = pool()
          
          // Check duplicates
          const [dupPhone] = await db.query('SELECT id FROM users WHERE phone = ?', [row.phone])
          if (dupPhone.length > 0) {
            errors.push({ row: rowNum, reason: "Duplicate phone" })
            skipped++
            continue
          }

          const [dupReg] = await db.query('SELECT user_id FROM students WHERE student_reg_no = ?', [row.student_reg_no])
          if (dupReg.length > 0) {
            errors.push({ row: rowNum, reason: "Duplicate reg no" })
            skipped++
            continue
          }

          await db.query('START TRANSACTION')
          
          const userId = crypto.randomUUID()
          await db.query(
            'INSERT INTO users (id, full_name, email, phone, password_hash, role, status, has_smartphone, reg_number, course, department) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            [userId, row.full_name, row.email || null, row.phone, hash, 'student', 'pending', row.has_smartphone === 'false' ? false : true, row.student_reg_no, row.course || null, row.department || null]
          )

          await db.query(
            'INSERT INTO students (user_id, admission_number, student_reg_no, department, programme, year_of_study, semester) VALUES (?,?,?,?,?,?,?)',
            [userId, row.student_reg_no, row.student_reg_no, row.department || null, row.programme || null, parseInt(row.year_of_study) || 1, parseInt(row.semester) || 1]
          )

          if (row.courses) {
            const courseCodes = row.courses.split(';')
            for (const code of courseCodes) {
              const [courseRows] = await db.query('SELECT id FROM courses WHERE code = ? OR name = ? LIMIT 1', [code.trim(), code.trim()])
              if (courseRows.length > 0) {
                const [units] = await db.query('SELECT id FROM units WHERE course_id = ?', [courseRows[0].id])
                for (const unit of units) {
                  await db.query('INSERT IGNORE INTO enrollments (student_id, unit_id) VALUES (?,?)', [userId, unit.id])
                }
              }
            }
          }

          await db.query('COMMIT')
          imported++
        } else {
          skipped++ // Fallback for mock not fully implemented
        }
      } catch (err) {
        if (isAvailable()) await pool().query('ROLLBACK');
        errors.push({ row: rowNum, reason: err.message })
        skipped++
      }
    }
    res.json({ message: `Imported ${imported} students`, total: results.length, imported, skipped, errors })
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
      const userId = crypto.randomUUID()
      await db.query('INSERT INTO users (id,full_name,email,password_hash,role,department,status) VALUES (?,?,?,?,?,?,?)',
        [userId, name, email, hash, 'lecturer', department || null, 'active'])
      return res.status(201).json({ id: userId, message: 'Lecturer created' })
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
      await db.query('UPDATE users SET full_name=COALESCE(?,full_name),email=COALESCE(?,email),department=COALESCE(?,department),is_active=COALESCE(?,is_active) WHERE id=? AND role=?',
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

// ─── PENDING REGISTRATIONS & APPROVALS ────────────────────────────────────────


// GET /api/admin/registrations
router.get('/registrations', isAdmin, async (req, res) => {
  const status = req.query.status || 'pending'
  try {
    if (isAvailable()) {
      const db = pool()
      const [rows] = await db.query(`
        SELECT u.id, u.full_name as name, u.phone, u.email, u.created_at,
               s.student_reg_no as reg_number, s.department, s.programme, s.year_of_study, s.semester
        FROM users u JOIN students s ON u.id = s.user_id
        WHERE u.role='student' AND u.status=?
        ORDER BY u.created_at DESC
      `, [status])
      return res.json({ registrations: rows })
    }
    const pending = mock.users
      .filter(u => u.role === 'student' && u.status === status)
      .map(({ password_hash, ...u }) => ({
        ...u,
        name: u.full_name,
        reg_number: u.reg_number || 'SCT221-0001/2023',
        department: u.department || 'Computing',
        programme: u.course || 'BSc Computer Science',
        year_of_study: 2,
        semester: 1
      }))
    res.json({ registrations: pending })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Legacy wrapper GET /api/admin/pending-registrations
router.get('/pending-registrations', isAdmin, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [rows] = await db.query(`
        SELECT u.id, u.full_name as name, u.phone, u.created_at,
               s.student_reg_no as reg_number, s.department, s.programme, s.year_of_study, s.semester
        FROM users u JOIN students s ON u.id = s.user_id
        WHERE u.role='student' AND u.status='pending'
        ORDER BY u.created_at DESC
      `)
      return res.json({ pending: rows })
    }
    const pending = mock.users
      .filter(u => u.role === 'student' && u.status === 'pending')
      .map(({ password_hash, ...u }) => ({
        ...u,
        name: u.full_name,
        reg_number: u.reg_number || 'SCT221-0001/2023',
        department: u.department || 'Computing',
        programme: u.course || 'BSc Computer Science',
        year_of_study: 2,
        semester: 1
      }))
    res.json({ pending })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/admin/registrations/:id
router.get('/registrations/:id', isAdmin, async (req, res) => {
  const { id } = req.params
  try {
    if (isAvailable()) {
      const db = pool()
      const [[user]] = await db.query(`
        SELECT u.id, u.full_name as name, u.phone, u.email, u.created_at, u.has_smartphone,
               s.student_reg_no as reg_number, s.department, s.programme, s.year_of_study, s.semester
        FROM users u JOIN students s ON u.id = s.user_id
        WHERE u.id=? AND u.role='student'
      `, [id])
      if (!user) return res.status(404).json({ message: 'Registration not found' })

      const [units] = await db.query(`
        SELECT u.id, u.name, u.code FROM units u JOIN enrollments e ON u.id = e.unit_id WHERE e.student_id=?
      `, [id])
      user.courses = units

      return res.json({ registration: user })
    }
    
    const u = mock.users.find(user => user.id === parseInt(id) && user.role === 'student')
    if (!u) return res.status(404).json({ message: 'Registration not found' })
    const registration = {
      id: u.id,
      name: u.full_name,
      phone: u.phone,
      email: u.email,
      created_at: u.created_at,
      has_smartphone: u.has_smartphone,
      reg_number: u.reg_number || 'SCT221-0001/2023',
      department: u.department || 'Computing',
      programme: u.course || 'BSc Computer Science',
      year_of_study: 2,
      semester: 1,
      courses: mock.units.slice(0, 3)
    }
    res.json({ registration })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/admin/registrations/approve-all
router.post('/registrations/approve-all', isAdmin, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [pendingUsers] = await db.query(
        "SELECT id, full_name, phone FROM users WHERE status = 'pending' AND role = 'student'"
      )
      const count = pendingUsers.length
      if (count === 0) {
        return res.json({ message: 'No pending registrations to approve', count: 0 })
      }

      await db.query(
        "UPDATE users SET status = 'active' WHERE status = 'pending' AND role = 'student'"
      )

      const { auditLog } = require('../services/audit.service')
      await auditLog({ 
        userId: req.user.id, 
        action: 'APPROVE_ALL_STUDENTS', 
        target: `users_count:${count}`, 
        ip: req.ip 
      })

      const { sendSMS, SMS } = require('../services/sms.service')
      const frontendUrl = process.env.FRONTEND_URL || 'https://attendance.uni.ac.ke'

      // Background non-blocking queue processing for SMS notifications
      setTimeout(async () => {
        const batchSize = 20
        for (let i = 0; i < pendingUsers.length; i += batchSize) {
          const batch = pendingUsers.slice(i, i + batchSize)
          await Promise.all(
            batch.map(async (u) => {
              try {
                if (u.phone) {
                  await sendSMS(u.phone, SMS.accountApproved(u.full_name, frontendUrl))
                }
              } catch (err) {
                console.error(`Error sending SMS to ${u.full_name}:`, err.message)
              }
            })
          )
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }, 0)

      return res.json({ message: `Successfully approved all ${count} pending registrations`, count })
    }

    res.json({ message: 'Approved all registrations (Mock)' })
  } catch (err) {
    console.error('Approve all error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/admin/registrations/:id/approve
router.post('/registrations/:id/approve', isAdmin, async (req, res) => {
  const { id } = req.params
  const { phone, year_of_study, semester, courses } = req.body
  try {
    if (isAvailable()) {
      const db = pool()
      const [[user]] = await db.query('SELECT full_name, phone FROM users WHERE id=?', [id])
      if (!user) return res.status(404).json({ message: 'User not found' })

      await db.query('START TRANSACTION')
      try {
        if (phone) {
          await db.query('UPDATE users SET phone=? WHERE id=?', [phone.trim(), id])
        }
        await db.query("UPDATE users SET status='active' WHERE id=?", [id])

        if (year_of_study !== undefined || semester !== undefined) {
          await db.query(`
            UPDATE students 
            SET year_of_study=COALESCE(?, year_of_study), semester=COALESCE(?, semester) 
            WHERE user_id=?
          `, [year_of_study, semester, id])
        }

        if (Array.isArray(courses)) {
          await db.query('DELETE FROM enrollments WHERE student_id=?', [id])
          for (const unitId of courses) {
            await db.query('INSERT IGNORE INTO enrollments (student_id, unit_id) VALUES (?,?)', [id, unitId])
          }
        }
        await db.query('COMMIT')
      } catch (err) {
        await db.query('ROLLBACK')
        throw err
      }

      const { sendSMS, SMS } = require('../services/sms.service')
      const targetPhone = phone || user.phone
      if (targetPhone) {
        await sendSMS(targetPhone, SMS.accountApproved(user.full_name, process.env.FRONTEND_URL || 'https://attendance.uni.ac.ke'))
      }

      const { auditLog } = require('../services/audit.service')
      await auditLog({ userId: req.user.id, action: 'APPROVE_STUDENT', target: `user:${id}`, ip: req.ip })

      return res.json({ message: 'Registration approved successfully' })
    }

    const u = mock.users.find(u => u.id === parseInt(id))
    if (u) {
      u.status = 'active'
      const { sendSMS, SMS } = require('../services/sms.service')
      const targetPhone = phone || u.phone
      if (targetPhone) {
        await sendSMS(targetPhone, SMS.accountApproved(u.full_name, process.env.FRONTEND_URL || 'https://attendance.uni.ac.ke'))
      }
    }
    res.json({ message: 'Registration approved successfully (Mock)' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Legacy wrapper POST /api/admin/approve-registration/:id
router.post('/approve-registration/:id', isAdmin, async (req, res) => {
  const { id } = req.params
  try {
    if (isAvailable()) {
      const db = pool()
      const [[user]] = await db.query('SELECT full_name, phone FROM users WHERE id=?', [id])
      if (!user) return res.status(404).json({ message: 'User not found' })

      await db.query("UPDATE users SET status='active' WHERE id=?", [id])

      const { sendSMS, SMS } = require('../services/sms.service')
      if (user.phone) {
        await sendSMS(user.phone, SMS.accountApproved(user.full_name, process.env.FRONTEND_URL || 'https://attendance.uni.ac.ke'))
      }

      const { auditLog } = require('../services/audit.service')
      await auditLog({ userId: req.user.id, action: 'APPROVE_STUDENT', target: `user:${id}`, ip: req.ip })

      return res.json({ message: 'Registration approved successfully' })
    }
    const u = mock.users.find(u => u.id === parseInt(id))
    if (u) {
      u.status = 'active'
      const { sendSMS, SMS } = require('../services/sms.service')
      if (u.phone) {
        await sendSMS(u.phone, SMS.accountApproved(u.full_name, process.env.FRONTEND_URL || 'https://attendance.uni.ac.ke'))
      }
    }
    res.json({ message: 'Registration approved (Mock)' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/admin/registrations/:id/reject
router.post('/registrations/:id/reject', isAdmin, async (req, res) => {
  const { id } = req.params
  const { reason, note } = req.body
  if (!reason) return res.status(400).json({ message: 'Rejection reason is required' })

  try {
    if (isAvailable()) {
      const db = pool()
      const [[user]] = await db.query('SELECT full_name, phone FROM users WHERE id=?', [id])
      if (!user) return res.status(404).json({ message: 'User not found' })

      await db.query('START TRANSACTION')
      try {
        await db.query('DELETE FROM students WHERE user_id=?', [id])
        await db.query('DELETE FROM enrollments WHERE student_id=?', [id])
        await db.query('DELETE FROM users WHERE id=?', [id])
        await db.query('COMMIT')
      } catch (err) {
        await db.query('ROLLBACK')
        throw err
      }

      const { sendSMS, SMS } = require('../services/sms.service')
      if (user.phone) {
        const fullReason = reason + (note ? `: ${note}` : '')
        await sendSMS(user.phone, SMS.accountRejected(fullReason, req.user.phone))
      }

      const { auditLog } = require('../services/audit.service')
      await auditLog({ userId: req.user.id, action: 'REJECT_STUDENT', target: `user:${id}`, detail: { reason, note }, ip: req.ip })

      return res.json({ message: 'Registration rejected and removed' })
    }

    const index = mock.users.findIndex(u => u.id === parseInt(id))
    if (index !== -1) {
      const u = mock.users[index]
      const { sendSMS, SMS } = require('../services/sms.service')
      if (u.phone) {
        const fullReason = reason + (note ? `: ${note}` : '')
        await sendSMS(u.phone, SMS.accountRejected(fullReason, req.user?.phone))
      }
      mock.users.splice(index, 1)
    }
    res.json({ message: 'Registration rejected and removed (Mock)' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// Legacy wrapper POST /api/admin/reject-registration/:id
router.post('/reject-registration/:id', isAdmin, async (req, res) => {
  const { id } = req.params
  const { reason } = req.body
  try {
    if (isAvailable()) {
      const db = pool()
      const [[user]] = await db.query('SELECT full_name, phone FROM users WHERE id=?', [id])
      if (!user) return res.status(404).json({ message: 'User not found' })

      await db.query('START TRANSACTION')
      await db.query('DELETE FROM students WHERE user_id=?', [id])
      await db.query('DELETE FROM enrollments WHERE student_id=?', [id])
      await db.query('DELETE FROM users WHERE id=?', [id])
      await db.query('COMMIT')

      const { sendSMS, SMS } = require('../services/sms.service')
      if (user.phone) {
        await sendSMS(user.phone, SMS.accountRejected(reason || 'Incorrect details uploaded.', req.user.phone))
      }

      const { auditLog } = require('../services/audit.service')
      await auditLog({ userId: req.user.id, action: 'REJECT_STUDENT', target: `user:${id}`, detail: { reason }, ip: req.ip })

      return res.json({ message: 'Registration rejected and removed' })
    }
    const index = mock.users.findIndex(u => u.id === parseInt(id))
    if (index !== -1) {
      const u = mock.users[index]
      const { sendSMS, SMS } = require('../services/sms.service')
      if (u.phone) {
        await sendSMS(u.phone, SMS.accountRejected(reason || 'Incorrect details uploaded.', req.user?.phone))
      }
      mock.users.splice(index, 1)
    }
    res.json({ message: 'Registration rejected (Mock)' })
  } catch (err) {
    if (isAvailable()) await pool().query('ROLLBACK')
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
