const express  = require('express')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const crypto   = require('crypto')
const { pool, isAvailable } = require('../config/db')
const mock     = require('../config/mockData')
const { authenticate } = require('../middleware/auth')
const { sendSMS, SMS } = require('../services/sms.service')
const { auditLog }     = require('../services/audit.service')

const router = express.Router()

const JWT_SECRET       = process.env.JWT_SECRET || 'mku_secret_key'
const JWT_EXPIRES      = '8h'
const REFRESH_EXPIRES  = '7d'
const MAX_ATTEMPTS     = 5
const LOCKOUT_MINUTES  = 30

// ── Token helpers ─────────────────────────────────────────────────────────────

function makeAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email, phone: user.phone },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}

function makeRefreshToken(user) {
  const raw  = `${user.id}:${Date.now()}:${Math.random()}`
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

function safeUser(u) {
  const { password_hash, failed_attempts, locked_until, student_reg_no, programme, student_department, ...rest } = u
  return rest
}

function normalizeUserData(u) {
  if (!u) return u
  return {
    ...u,
    name: u.name || u.full_name,
    reg_number: u.reg_number || u.student_reg_no,
    course: u.course || u.programme,
    department: u.department || u.student_department,
  }
}

// ── Account lockout helpers ───────────────────────────────────────────────────

async function checkLockout(identifier, db) {
  if (!db) return null
  const [[u]] = await db.query(
    `SELECT u.id, u.full_name, u.phone, u.failed_attempts, u.locked_until
     FROM users u
     LEFT JOIN students s ON s.user_id = u.id
     WHERE u.email=? OR u.phone=? OR u.reg_number=? OR s.student_reg_no=?
     LIMIT 1`,
    [identifier, identifier, identifier, identifier]
  )
  if (!u) return null
  if (u.locked_until && new Date(u.locked_until) > new Date()) {
    const remaining = Math.ceil((new Date(u.locked_until) - Date.now()) / 60000)
    return { locked: true, user: u, remaining }
  }
  return { locked: false, user: u }
}

async function recordFailedAttempt(userId, phone, db) {
  if (!db) return
  const [[u]] = await db.query('SELECT failed_attempts FROM users WHERE id=?', [userId])
  const attempts = (u?.failed_attempts || 0) + 1
  if (attempts >= MAX_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
    await db.query(
      'UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?',
      [attempts, lockUntil, userId]
    )
    if (phone) {
      sendSMS(phone, SMS.accountLocked(LOCKOUT_MINUTES))
    }
  } else {
    await db.query('UPDATE users SET failed_attempts=? WHERE id=?', [attempts, userId])
  }
}

async function clearAttempts(userId, db) {
  if (!db) return
  await db.query('UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=?', [userId])
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body
  const ip = req.ip || req.connection?.remoteAddress

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Identifier and password are required' })
  }

  try {
    if (isAvailable()) {
      const db = pool()
      const check = await checkLockout(identifier.trim(), db)

      if (!check) {
        return res.status(401).json({ message: 'No account found with that phone number, email or registration number.' })
      }
      if (check.locked) {
        return res.status(423).json({
          message: `Account locked for ${check.remaining} more minute(s) due to too many failed attempts.`,
          locked: true,
          remainingMinutes: check.remaining
        })
      }

      const user = check.user
      // Now fetch full user row
      const [[fullUser]] = await db.query(`
        SELECT u.*, s.student_reg_no AS student_reg_no, s.programme, s.department AS student_department
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        WHERE u.id=?
      `, [user.id])
      const normalizedUser = normalizeUserData(fullUser)

      const valid = await bcrypt.compare(password, normalizedUser.password_hash)
      if (!valid) {
        await recordFailedAttempt(fullUser.id, fullUser.phone, db)
        const [[fresh]] = await db.query('SELECT failed_attempts FROM users WHERE id=?', [fullUser.id])
        const remaining = MAX_ATTEMPTS - (fresh?.failed_attempts || 0)
        await auditLog({ userId: fullUser.id, action: 'LOGIN_FAILED', ip })
        return res.status(401).json({
          message: remaining > 0
            ? `Incorrect password. ${remaining} attempt(s) remaining.`
            : `Account locked for ${LOCKOUT_MINUTES} minutes.`,
          attemptsLeft: Math.max(0, remaining)
        })
      }

      if (fullUser.status === 'suspended') {
        return res.status(403).json({ message: 'Account suspended. Contact your admin.' })
      }
      if (fullUser.status === 'pending') {
        const [[admin]] = await db.query("SELECT phone FROM users WHERE role='admin' AND phone IS NOT NULL LIMIT 1")
        const adminPhone = admin?.phone || '0712345678'
        return res.status(403).json({ 
          message: `Your account is still pending approval. You will receive an SMS once the admin approves your registration. Questions? Call: ${adminPhone}` 
        })
      }

      await clearAttempts(fullUser.id, db)

      const token   = makeAccessToken(normalizedUser)
      const refresh = makeRefreshToken(normalizedUser)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await db.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)',
        [normalizedUser.id, refresh.hash, expiresAt]
      )

      await auditLog({ userId: normalizedUser.id, action: 'LOGIN', ip })

      res.cookie('refresh_token', refresh.raw, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
      })

      return res.json({ token, user: safeUser(normalizedUser) })
    }

    // ── Mock fallback ─────────────────────────────────────────────────────────
    const mockUser = mock.users.find(u => {
      if (!u.is_active) return false
      const iden = identifier.trim().toLowerCase()
      const uEmail = u.email ? u.email.toLowerCase() : ''
      const uPhone = u.phone || ''
      const uReg = u.reg_number ? u.reg_number.toLowerCase() : ''
      return uEmail === iden || uPhone === iden || uReg === iden
    })
    if (!mockUser) return res.status(401).json({ message: 'Invalid credentials' })
    if (mockUser.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended. Contact your admin.' })
    }
    if (mockUser.status === 'pending') {
      return res.status(403).json({ 
        message: 'Your account is still pending approval. You will receive an SMS once the admin approves your registration. Questions? Call: 0712345678' 
      })
    }
    const valid = await bcrypt.compare(password, mockUser.password_hash)
    if (!valid) return res.status(401).json({ message: 'Incorrect password. 4 attempts remaining.', attemptsLeft: 4 })
    const token = makeAccessToken(mockUser)
    return res.json({ token, user: safeUser(mockUser) })

  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: 'Server error during login' })
  }
})

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

router.post('/refresh', async (req, res) => {
  const rawToken = req.cookies?.refresh_token
  if (!rawToken) return res.status(401).json({ message: 'No refresh token' })

  const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
  try {
    if (!isAvailable()) return res.status(501).json({ message: 'Refresh not available in mock mode' })
    const db = pool()
    const [[rt]] = await db.query(
      'SELECT * FROM refresh_tokens WHERE token_hash=? AND revoked=0 AND expires_at > NOW()',
      [hash]
    )
    if (!rt) return res.status(401).json({ message: 'Invalid or expired refresh token. Please log in again.' })

    const [[user]] = await db.query('SELECT * FROM users WHERE id=?', [rt.user_id])
    if (!user || user.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended' })
    }

    const newToken   = makeAccessToken(user)
    const newRefresh = makeRefreshToken(user)
    const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.query('UPDATE refresh_tokens SET revoked=1 WHERE id=?', [rt.id])
    await db.query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)',
      [user.id, newRefresh.hash, expiresAt])

    res.cookie('refresh_token', newRefresh.raw, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    res.json({ token: newToken })
  } catch (err) {
    console.error('Refresh error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

router.post('/logout', authenticate, async (req, res) => {
  const rawToken = req.cookies?.refresh_token
  if (rawToken && isAvailable()) {
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const db = pool()
    await db.query('UPDATE refresh_tokens SET revoked=1 WHERE token_hash=?', [hash]).catch(() => {})
    await auditLog({ userId: req.user.id, action: 'LOGOUT', ip: req.ip })
  }
  res.clearCookie('refresh_token')
  res.json({ message: 'Logged out successfully' })
})

// ── POST /api/auth/forgot-password ───────────────────────────────────────────

router.post('/forgot-password', async (req, res) => {
  const { identifier } = req.body
  if (!identifier) return res.status(400).json({ message: 'Phone number or reg number required' })

  try {
    let user = null
    if (isAvailable()) {
      const db = pool()
      const [[row]] = await db.query(
        `SELECT u.id, u.full_name, u.phone, u.status
         FROM users u
         LEFT JOIN students s ON s.user_id = u.id
         WHERE u.phone=? OR u.reg_number=? OR s.student_reg_no=? OR u.email=?
         LIMIT 1`,
        [identifier.trim(), identifier.trim(), identifier.trim(), identifier.trim()]
      )
      user = row
    } else {
      user = mock.users.find(u => {
        const iden = identifier.trim().toLowerCase()
        const uPhone = u.phone || ''
        const uReg = u.reg_number ? u.reg_number.toLowerCase() : ''
        return uPhone === iden || uReg === iden
      })
    }

    if (!user) {
      return res.status(404).json({ message: 'No account found with that detail. Contact your admin.' })
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ message: `Account suspended. Contact admin.` })
    }

    const otp     = Math.floor(100000 + Math.random() * 900000).toString()
    const otpHash = await bcrypt.hash(otp, 8)


    if (isAvailable()) {
      const db = pool()
      // Invalidate any old OTPs
      await db.query("UPDATE otp_codes SET used=1 WHERE identifier=? AND purpose='forgot_password'", [identifier.trim()])
      await db.query(
        "INSERT INTO otp_codes (identifier, otp_hash, purpose, expires_at) VALUES (?,?,'forgot_password', DATE_ADD(NOW(), INTERVAL 10 MINUTE))",
        [identifier.trim(), otpHash]
      )
    }

    const phone = user.phone || (identifier.trim().startsWith('0') ? identifier.trim() : null)
    if (phone) {
      await sendSMS(phone, SMS.otp(otp))
    }

    console.log(`[OTP] ${otp} for ${identifier}`) // Always log in dev

    return res.json({ message: 'OTP sent to your registered phone number.', phone_hint: phone ? phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4) : null })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────

router.post('/verify-otp', async (req, res) => {
  const { identifier, otp } = req.body
  if (!identifier || !otp) return res.status(400).json({ message: 'Identifier and OTP required' })

  try {
    if (isAvailable()) {
      const db = pool()
      const [[record]] = await db.query(
        "SELECT * FROM otp_codes WHERE identifier=? AND purpose='forgot_password' AND used=0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
        [identifier.trim()]
      )
      if (!record) return res.status(400).json({ message: 'OTP expired or not found. Request a new one.' })

      const valid = await bcrypt.compare(otp.trim(), record.otp_hash)
      if (!valid) return res.status(400).json({ message: 'Incorrect OTP code.' })

      // Mark used, issue one-time reset token
      await db.query('UPDATE otp_codes SET used=1 WHERE id=?', [record.id])
      const resetToken = crypto.randomBytes(32).toString('hex')
      const resetHash  = crypto.createHash('sha256').update(resetToken).digest('hex')
      const exp = new Date(Date.now() + 15 * 60 * 1000)
      await db.query(
        "INSERT INTO otp_codes (identifier, otp_hash, purpose, expires_at) VALUES (?,?,'password_reset',?)",
        [identifier.trim(), resetHash, exp]
      )
      return res.json({ message: 'OTP verified.', reset_token: resetToken })
    }
    // Mock: accept 123456
    if (otp !== '123456') return res.status(400).json({ message: 'Incorrect OTP code.' })
    return res.json({ message: 'OTP verified.', reset_token: 'mock_reset_token_abc123' })
  } catch (err) {
    console.error('Verify OTP error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/auth/reset-password ────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {
  const { identifier, reset_token, new_password } = req.body
  if (!identifier || !reset_token || !new_password) {
    return res.status(400).json({ message: 'All fields required' })
  }
  if (new_password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' })
  }

  try {
    if (isAvailable()) {
      const db = pool()
      const tokenHash = crypto.createHash('sha256').update(reset_token).digest('hex')
      const [[record]] = await db.query(
        "SELECT * FROM otp_codes WHERE identifier=? AND otp_hash=? AND purpose='password_reset' AND used=0 AND expires_at > NOW() LIMIT 1",
        [identifier.trim(), tokenHash]
      )
      if (!record) return res.status(400).json({ message: 'Reset link expired. Request a new OTP.' })

      const hash = await bcrypt.hash(new_password, 12)
      await db.query(
        `UPDATE users u
         LEFT JOIN students s ON s.user_id = u.id
         SET u.password_hash=?, u.failed_attempts=0, u.locked_until=NULL
         WHERE u.phone=? OR u.reg_number=? OR s.student_reg_no=? OR u.email=?`,
        [hash, identifier.trim(), identifier.trim(), identifier.trim(), identifier.trim()]
      )
      await db.query('UPDATE otp_codes SET used=1 WHERE id=?', [record.id])

      // Revoke all existing refresh tokens (logout all devices)
      const [[user]] = await db.query(
        `SELECT u.id, u.phone
         FROM users u
         LEFT JOIN students s ON s.user_id = u.id
         WHERE u.phone=? OR u.reg_number=? OR s.student_reg_no=? OR u.email=?
         LIMIT 1`,
        [identifier.trim(), identifier.trim(), identifier.trim(), identifier.trim()])
      if (user) {
        await db.query('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?', [user.id])
        if (user.phone) sendSMS(user.phone, SMS.passwordChanged())
        await auditLog({ userId: user.id, action: 'PASSWORD_RESET' })
      }

      return res.json({ message: 'Password reset successfully. Please log in with your new password.' })
    }
    return res.json({ message: 'Password reset successfully (mock). Please log in.' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [[user]] = await db.query(
        `SELECT u.id, u.full_name as name, u.email, u.phone, u.role, u.status, u.created_at, u.has_smartphone, u.preferred_attendance_method,
                s.student_reg_no as reg_number
         FROM users u
         LEFT JOIN students s ON u.id = s.user_id
         WHERE u.id=?`,
        [req.user.id]
      )
      if (!user) return res.status(404).json({ message: 'User not found' })
      return res.json(user)
    }
    const user = mock.users.find(u => u.id === req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    
    // Add defaults for mock student user
    const userObj = safeUser(user)
    if (userObj.role === 'student') {
      userObj.reg_number = userObj.reg_number || 'SCT221-0001/2023'
      userObj.has_smartphone = userObj.has_smartphone !== undefined ? userObj.has_smartphone : true
      userObj.preferred_attendance_method = userObj.preferred_attendance_method || 'qr'
    }
    res.json(userObj)
  } catch (err) {
    console.error('Error fetching current user:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUT /api/auth/change-password ─────────────────────────────────────────────

router.put('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords required' })
  if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' })

  try {
    if (isAvailable()) {
      const db = pool()
      const [[user]] = await db.query('SELECT password_hash, phone FROM users WHERE id=?', [req.user.id])
      if (!user) return res.status(404).json({ message: 'User not found' })
      const valid = await bcrypt.compare(currentPassword, user.password_hash)
      if (!valid) return res.status(400).json({ message: 'Current password is incorrect' })
      const hash = await bcrypt.hash(newPassword, 12)
      await db.query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id])
      if (user.phone) sendSMS(user.phone, SMS.passwordChanged())
      await auditLog({ userId: req.user.id, action: 'CHANGE_PASSWORD', ip: req.ip })
      return res.json({ message: 'Password changed successfully' })
    }
    res.json({ message: 'Password changed (mock)' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/auth/registration-metadata ────────────────────────────────────────
router.get('/registration-metadata', async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [courses] = await db.query('SELECT id, name, code FROM courses ORDER BY name')
      const [units] = await db.query('SELECT id, course_id, name, code FROM units ORDER BY name')
      
      const programs = courses.map(c => {
        let dept = 'Computing'
        if (c.code.includes('MATH') || c.name.toLowerCase().includes('math')) dept = 'Mathematics'
        return {
          id: c.id,
          name: c.name,
          code: c.code,
          department: dept,
          units: units.filter(u => u.course_id === c.id)
        }
      })

      return res.json({
        departments: ['Computing', 'Mathematics'],
        programmes: programs
      })
    }
    
    // Mock Fallback
    const mockPrograms = mock.courses.map(c => {
      let dept = 'Computing'
      if (c.code.includes('MATH') || c.name.toLowerCase().includes('math')) dept = 'Mathematics'
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        department: dept,
        units: mock.units.filter(u => u.course_id === c.id)
      }
    })
    return res.json({
      departments: ['Computing', 'Mathematics'],
      programmes: mockPrograms
    })
  } catch (err) {
    console.error('Registration metadata error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/register', async (req, res) => {
  res.redirect(307, '/api/auth/register/student')
})

router.post('/register/student', async (req, res) => {
  const { 
    full_name, 
    student_reg_no, 
    phone, 
    email, 
    department, 
    programme, 
    year, 
    year_of_study, 
    semester, 
    courses, 
    password, 
    has_smartphone 
  } = req.body

  if (!full_name || !student_reg_no || !phone || !password) {
    return res.status(400).json({ message: 'Name, reg number, phone, and password are required' })
  }

  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  if (password.length < 8 || !hasUppercase || !hasNumber) {
    return res.status(400).json({ message: 'Password must be at least 8 characters, contain at least one uppercase letter and one number' })
  }

  try {
    if (isAvailable()) {
      const db = pool()

      const [[existPhone]] = await db.query('SELECT id FROM users WHERE phone=?', [phone.trim()])
      if (existPhone) {
        return res.status(409).json({ message: 'This phone number is already registered. If you already have an account contact admin.' })
      }
      const [[existReg]] = await db.query('SELECT user_id FROM students WHERE student_reg_no=?', [student_reg_no])
      if (existReg) {
        return res.status(409).json({ message: 'This registration number already exists. Contact admin if you think this is an error.' })
      }

      if (email && email.trim()) {
        const [[existEmail]] = await db.query('SELECT id FROM users WHERE email=?', [email.trim()])
        if (existEmail) return res.status(409).json({ message: 'Email address already registered' })
      }

      const hash = await bcrypt.hash(password, 12)
      const dept = department || (programme && /math/i.test(programme) ? 'Mathematics' : 'Computing')
      await db.query('START TRANSACTION')
      try {
        const userId = crypto.randomUUID()
      await db.query(
        "INSERT INTO users (id, full_name, phone, email, password_hash, role, status, has_smartphone, reg_number, course, department) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [userId, full_name, phone.trim(), email ? email.trim() : null, hash, 'student', 'pending', has_smartphone === false || has_smartphone === 'false' ? 0 : 1, student_reg_no.trim(), programme || null, dept || null]
      )
      await db.query(
        'INSERT INTO students (user_id, admission_number, student_reg_no, department, programme, year_of_study, semester) VALUES (?,?,?,?,?,?,?)',
        [userId, student_reg_no.trim(), student_reg_no.trim(), dept || null, programme || null, year || year_of_study || 1, semester || 1]
      )

      if (Array.isArray(courses)) {
          for (const item of courses) {
            if (typeof item === 'number' || !isNaN(item)) {
              await db.query('INSERT IGNORE INTO enrollments (student_id, unit_id) VALUES (?,?)', [userId, parseInt(item, 10)])
            } else {
              const [[unit]] = await db.query('SELECT id FROM units WHERE code=?', [item])
              if (unit) {
                await db.query('INSERT IGNORE INTO enrollments (student_id, unit_id) VALUES (?,?)', [userId, unit.id])
              } else {
                const [[course]] = await db.query('SELECT id FROM courses WHERE code=?', [item])
                if (course) {
                  const [courseUnits] = await db.query('SELECT id FROM units WHERE course_id=?', [course.id])
                  for (const cu of courseUnits) {
                    await db.query('INSERT IGNORE INTO enrollments (student_id, unit_id) VALUES (?,?)', [userId, cu.id])
                  }
                }
              }
            }
          }
        }
        await db.query('COMMIT')

        // Notify admins
        const [admins] = await db.query("SELECT phone FROM users WHERE role='admin' AND phone IS NOT NULL")
        for (const admin of admins) {
          sendSMS(admin.phone, SMS.registrationPending(full_name, student_reg_no))
        }
        await auditLog({ userId, action: 'STUDENT_SELF_REGISTER', detail: { student_reg_no } })
        return res.status(201).json({ message: 'Registration submitted! Awaiting admin approval. You will receive an SMS once approved.' })
      } catch (err) {
        await db.query('ROLLBACK')
        throw err
      }
    }

    // Mock Mode Persistent Registration
    const nextId = mock.users.length > 0 ? Math.max(...mock.users.map(u => u.id)) + 1 : 1
    const hash = await bcrypt.hash(password, 10)
    const newMockUser = {
      id: nextId,
      full_name: full_name,
      email: email ? email.trim() : `${phone}@mku.ac.ke`,
      phone: phone.trim(),
      password_hash: hash,
      role: 'student',
      reg_number: student_reg_no,
      course: programme || 'BSc Computer Science',
      department: department || 'Computing',
      status: 'pending',
      is_active: true,
      has_smartphone: has_smartphone === false || has_smartphone === 'false' ? false : true,
      preferred_attendance_method: has_smartphone === false || has_smartphone === 'false' ? 'ussd' : 'qr',
      created_at: new Date().toISOString()
    }
    mock.users.push(newMockUser)
    
    // Automatically enroll in mock units
    if (Array.isArray(courses)) {
      for (const item of courses) {
        const uId = parseInt(item, 10)
        if (!isNaN(uId)) {
          mock.enrollments.push({ student_id: nextId, unit_id: uId, status: 'active' })
        }
      }
    } else {
      mock.enrollments.push({ student_id: nextId, unit_id: 1, status: 'active' })
    }

    console.log(`[MOCK REGISTRATION] Added user: ${full_name} (${student_reg_no}) as ID: ${nextId}`)
    return res.status(201).json({ message: 'Registration submitted (mock). Awaiting admin approval.' })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ message: 'Server error during registration' })
  }
})

module.exports = router
