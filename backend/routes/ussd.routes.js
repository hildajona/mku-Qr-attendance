const express = require('express')
const { pool, isAvailable } = require('../config/db')
const router = express.Router()

// ═══════════════════════════════════════════════════════════════════════════════
// USSD CALLBACK — Africa's Talking
// POST /api/ussd
// Supports both:
//   1. *384*[SESSION_CODE]#  — code extracted from serviceCode
//   2. Direct dial *384*5000# — student enters code manually
// ═══════════════════════════════════════════════════════════════════════════════

const handleUSSD = async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body

  let response = ''
  const inputParts = text ? text.split('*') : []
  const step = inputParts.filter(p => p !== '').length

  try {
    if (!isAvailable()) {
      return res.send('END MKU Attendance USSD — Database unavailable. Try again later.')
    }

    const db = pool()

    // ─── Try to extract session code from serviceCode (*384*XK94M2#) ─────────
    let preloadedCode = null
    if (serviceCode && serviceCode !== '*384*5000#' && serviceCode !== '*384#') {
      const match = serviceCode.match(/\*384\*([A-Za-z0-9]{4,8})#/)
      if (match) preloadedCode = match[1].toUpperCase()
    }

    // ─── Look up student by phone number ────────────────────────────────────
    const normalizedPhone = normalizePhone(phoneNumber)
    const [[user]] = await db.query(
      `SELECT u.id, u.full_name, s.student_reg_no 
       FROM users u JOIN students s ON u.id = s.user_id 
       WHERE (u.phone = ? OR u.phone = ? OR u.phone = ?)
         AND u.role='student' AND u.status='active' LIMIT 1`,
      [phoneNumber, normalizedPhone, phoneNumber.replace('+254', '0')]
    )

    // ═════════════════════════════════════════════════════════════════════════
    // FLOW A — Phone recognized + session code from dial string
    // ═════════════════════════════════════════════════════════════════════════
    if (user && preloadedCode) {
      if (step === 0 || text === '') {
        // First interaction: show welcome + ask for reg number confirmation
        const session = await findSessionByCode(preloadedCode, db)
        if (!session) {
          return res.send('END Session not found or code expired.\nCheck the projector for the current code.')
        }

        const enrolled = await isEnrolled(user.id, session.unit_id, db)
        if (!enrolled) {
          return res.send(`END You are not enrolled in ${session.unit_name}.`)
        }

        response = `CON MKU Attend\nWelcome ${user.full_name}\n${session.unit_code} - ${session.unit_name}\n${formatDate(session.started_at)}\n\nEnter your Student ID to confirm:`
      } else if (step === 1) {
        // Student entered their reg number
        const enteredRegNo = inputParts[0].trim().toUpperCase()

        if (user.student_reg_no.toUpperCase() !== enteredRegNo) {
          return res.send('END ID mismatch. Your reg number does not match this phone.\nAttendance NOT marked.')
        }

        const session = await findSessionByCode(preloadedCode, db)
        if (!session) {
          return res.send('END Session code expired. Ask lecturer for the new code.')
        }

        response = await markAttendanceUSSD(user, session, db)
      }
      res.set('Content-Type', 'text/plain')
      return res.send(response)
    }

    // ═════════════════════════════════════════════════════════════════════════
    // FLOW B — Phone recognized, manual code entry (*384*5000#)
    // ═════════════════════════════════════════════════════════════════════════
    if (user && !preloadedCode) {
      if (step === 0 || text === '') {
        response = `CON MKU Attend\nWelcome ${user.full_name}\n(${user.student_reg_no})\n\nEnter the 6-digit Class Code\nshown on the projector:`
      } else if (step === 1) {
        const code = inputParts[0].trim().toUpperCase()
        const session = await findSessionByCode(code, db)
        if (!session) {
          return res.send('END Invalid or expired code.\nCheck the projector for the current code.')
        }

        const enrolled = await isEnrolled(user.id, session.unit_id, db)
        if (!enrolled) {
          return res.send(`END You are not enrolled in ${session.unit_name}.`)
        }

        response = await markAttendanceUSSD(user, session, db)
      }
      res.set('Content-Type', 'text/plain')
      return res.send(response)
    }

    // ═════════════════════════════════════════════════════════════════════════
    // FLOW C — Phone NOT recognized, must enter reg number first
    // ═════════════════════════════════════════════════════════════════════════
    if (!user) {
      if (step === 0 || text === '') {
        response = 'CON Welcome to MKU Attendance.\nYour phone is not registered.\n\nPlease enter your Registration Number:'
      } else if (step === 1) {
        const regNo = inputParts[0].trim().toUpperCase()
        response = `CON Reg: ${regNo}\nEnter the 6-digit Class Code\nfrom the projector:`
      } else if (step === 2) {
        const regNo = inputParts[0].trim().toUpperCase()
        const code = inputParts[1].trim().toUpperCase()

        // Find student by reg number
        const [[studentUser]] = await db.query(
          `SELECT u.id, u.full_name, s.student_reg_no 
           FROM users u JOIN students s ON u.id = s.user_id 
           WHERE s.student_reg_no = ? AND u.role='student' AND u.status='active' LIMIT 1`,
          [regNo]
        )

        if (!studentUser) {
          return res.send('END Registration number not found or account not active.\nContact admin.')
        }

        const session = await findSessionByCode(code, db)
        if (!session) {
          return res.send('END Invalid or expired session code.\nCheck the projector.')
        }

        const enrolled = await isEnrolled(studentUser.id, session.unit_id, db)
        if (!enrolled) {
          return res.send(`END You are not enrolled in ${session.unit_name}.`)
        }

        response = await markAttendanceUSSD(studentUser, session, db)
      }
    }

    res.set('Content-Type', 'text/plain')
    res.send(response || 'END Error processing request. Try again.')

  } catch (err) {
    console.error('USSD Error:', err)
    res.set('Content-Type', 'text/plain')
    res.send('END System error. Please try again later.')
  }
}

router.post('/', handleUSSD)
router.post('/callback', handleUSSD)

// ═══════════════════════════════════════════════════════════════════════════════
// SMS INCOMING — Africa's Talking Webhook
// POST /api/ussd/sms-incoming
// Format: ATTEND [SESSION_CODE] [REG_NUMBER]
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/sms-incoming', async (req, res) => {
  const { from, text } = req.body
  if (!from || !text) return res.status(400).json({ message: 'Missing fields' })

  const rawText = text.trim()
  const parts = rawText.split(/\s+/)

  try {
    if (!isAvailable()) return res.sendStatus(200)

    const db = pool()
    const { sendSMS } = require('../services/sms.service')
    const normalizedPhone = normalizePhone(from)

    // ── Validate format ─────────────────────────────────────────────────────
    if (parts[0].toUpperCase() !== 'ATTEND' || parts.length < 3) {
      await sendSMS(from,
        'MKU Attend: Wrong format.\nReply: ATTEND CODE REGNO\ne.g. ATTEND XK94M2 SCT221-0001/2023'
      )
      return res.sendStatus(200)
    }

    const code = parts[1].trim().toUpperCase()
    const regNo = parts.slice(2).join(' ').trim().toUpperCase()

    // ── Find student by phone ───────────────────────────────────────────────
    const [[user]] = await db.query(
      `SELECT u.id, u.full_name, s.student_reg_no 
       FROM users u JOIN students s ON u.id = s.user_id 
       WHERE (u.phone = ? OR u.phone = ? OR u.phone = ?)
         AND u.role='student' AND u.status='active' LIMIT 1`,
      [from, normalizedPhone, from.replace('+254', '0')]
    )

    if (!user) {
      await sendSMS(from, 'MKU Attend: This phone number is not registered.\nContact admin to register your phone.')
      return res.sendStatus(200)
    }

    // ── Validate reg number matches phone owner ─────────────────────────────
    if (user.student_reg_no.toUpperCase() !== regNo) {
      await sendSMS(from,
        `MKU Attend: Reg number does not match this phone.\nExpected: ${user.student_reg_no}\nAttendance NOT marked.`
      )
      return res.sendStatus(200)
    }

    // ── Find session by code ────────────────────────────────────────────────
    const session = await findSessionByCode(code, db)
    if (!session) {
      await sendSMS(from,
        'MKU Attend: Session code expired or invalid.\nAsk lecturer to confirm your attendance manually.'
      )
      return res.sendStatus(200)
    }

    // ── Check enrollment ────────────────────────────────────────────────────
    const enrolled = await isEnrolled(user.id, session.unit_id, db)
    if (!enrolled) {
      await sendSMS(from, `MKU Attend: You are not enrolled in ${session.unit_name}.\nContact admin.`)
      return res.sendStatus(200)
    }

    // ── Check duplicate ─────────────────────────────────────────────────────
    const [[existing]] = await db.query(
      'SELECT id FROM attendance WHERE session_id=? AND student_id=?',
      [session.id, user.id]
    )
    if (existing) {
      await sendSMS(from, `MKU Attend: Already marked for ${session.unit_name}.`)
      return res.sendStatus(200)
    }

    // ── Mark attendance ─────────────────────────────────────────────────────
    const minutesSinceStart = (Date.now() - new Date(session.started_at)) / 60000
    const [[settings]] = await db.query('SELECT late_threshold_minutes FROM settings WHERE id=1')
    const lateThreshold = settings?.late_threshold_minutes || 15
    const status = minutesSinceStart > lateThreshold ? 'late' : 'present'

    await db.query(
      "INSERT INTO attendance (session_id, student_id, status, device_info, attendance_method) VALUES (?,?,?,?,?)",
      [session.id, user.id, status, `SMS from ${from}`, 'sms']
    )

    // ── Emit WebSocket event ────────────────────────────────────────────────
    try {
      const io = require('../server').io
      if (io) {
        io.to(`session:${session.id}`).emit('student_scanned', {
          student_id: user.id,
          name: user.full_name,
          reg_number: user.student_reg_no,
          status,
          method: 'sms',
          marked_at: new Date().toISOString()
        })
      }
    } catch { /* io might not be available */ }

    const timeStr = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    await sendSMS(from,
      `MKU Attend: Attendance marked for ${session.unit_code || session.unit_name}.\n${user.full_name} | ${status === 'late' ? 'LATE' : 'PRESENT'} | ${timeStr}\nMKU Thika Campus`
    )

  } catch (err) {
    console.error('Incoming SMS Error:', err)
  }

  res.sendStatus(200)
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/ussd/no-smartphone-students/:sessionId
// Returns list of no-smartphone students enrolled in the session's unit
// Used by lecturer dashboard to show reminders
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/no-smartphone-students/:sessionId', async (req, res) => {
  try {
    if (!isAvailable()) return res.json({ students: [] })
    const db = pool()
    const [[session]] = await db.query('SELECT unit_id FROM sessions WHERE id=?', [req.params.sessionId])
    if (!session) return res.json({ students: [] })

    const [students] = await db.query(
      `SELECT u.id, u.full_name as name, s.student_reg_no as reg_number, u.phone,
              u.preferred_attendance_method as method,
              (SELECT COUNT(*) FROM attendance a WHERE a.student_id = u.id AND a.session_id = ?) > 0 as already_marked
       FROM users u 
       JOIN students s ON u.id = s.user_id
       JOIN enrollments e ON e.student_id = u.id AND e.unit_id = ?
       WHERE u.has_smartphone = 0 AND u.role='student' AND u.status='active'
       ORDER BY u.full_name`,
      [req.params.sessionId, session.unit_id]
    )

    res.json({ students })
  } catch (err) {
    console.error('No-smartphone students error:', err)
    res.json({ students: [] })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/ussd/notify-no-smartphone
// Sends SMS to all no-smartphone students when a session opens
// Body: { session_id }
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/notify-no-smartphone', async (req, res) => {
  const { session_id } = req.body
  if (!session_id) return res.status(400).json({ message: 'session_id required' })

  try {
    if (!isAvailable()) return res.json({ sent: 0 })
    const db = pool()

    const [[session]] = await db.query(
      `SELECT s.*, u.name as unit_name, u.code as unit_code 
       FROM sessions s JOIN units u ON u.id = s.unit_id 
       WHERE s.id = ?`,
      [session_id]
    )
    if (!session) return res.status(404).json({ message: 'Session not found' })

    const code = session.rotating_code || session.ussd_session_code || '------'

    // Find all no-smartphone students enrolled in this unit
    const [noPhoneStudents] = await db.query(
      `SELECT u.id, u.full_name, u.phone, s.student_reg_no
       FROM users u
       JOIN students s ON u.id = s.user_id
       JOIN enrollments e ON e.student_id = u.id AND e.unit_id = ?
       WHERE u.has_smartphone = 0 AND u.role='student' AND u.status='active' AND u.phone IS NOT NULL`,
      [session.unit_id]
    )

    const { sendSMS } = require('../services/sms.service')
    let sent = 0
    const expiryTime = new Date(Date.now() + 20 * 60 * 1000).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })

    for (const student of noPhoneStudents) {
      try {
        await sendSMS(student.phone,
          `MKU Attend: ${session.unit_code || session.unit_name} class is NOW open.\n` +
          `Reply: ATTEND ${code} ${student.student_reg_no}\n` +
          `OR dial *384*5000# and enter code ${code}\n` +
          `Expires: ${expiryTime} | MKU Thika`
        )
        sent++
      } catch (e) {
        console.error(`SMS send failed for ${student.phone}:`, e.message)
      }
    }

    res.json({ sent, total: noPhoneStudents.length })
  } catch (err) {
    console.error('Notify no-smartphone error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function normalizePhone(phone) {
  if (!phone) return ''
  let p = phone.trim()
  if (p.startsWith('+254')) p = '0' + p.slice(4)
  if (p.startsWith('254')) p = '0' + p.slice(3)
  return p
}

async function findSessionByCode(code, db) {
  // Try rotating_code first, then ussd_session_code
  const [[session]] = await db.query(
    `SELECT s.*, u.name as unit_name, u.code as unit_code 
     FROM sessions s JOIN units u ON u.id = s.unit_id 
     WHERE s.is_active = 1 
       AND (s.rotating_code = ? OR s.ussd_session_code = ?)
       AND (s.rotating_code_expires > NOW() OR s.ussd_session_code IS NOT NULL)
     LIMIT 1`,
    [code, code]
  )
  return session || null
}

async function isEnrolled(studentId, unitId, db) {
  const [[enrollment]] = await db.query(
    'SELECT id FROM enrollments WHERE student_id=? AND unit_id=?',
    [studentId, unitId]
  )
  return !!enrollment
}

async function markAttendanceUSSD(user, session, db) {
  // Check duplicate
  const [[existing]] = await db.query(
    'SELECT id FROM attendance WHERE session_id=? AND student_id=?',
    [session.id, user.id]
  )
  if (existing) {
    return `END Already marked for ${session.unit_name}.`
  }

  // Determine late status
  const minutesSinceStart = (Date.now() - new Date(session.started_at)) / 60000
  const [[settings]] = await db.query('SELECT late_threshold_minutes FROM settings WHERE id=1')
  const lateThreshold = settings?.late_threshold_minutes || 15
  const status = minutesSinceStart > lateThreshold ? 'late' : 'present'

  await db.query(
    "INSERT INTO attendance (session_id, student_id, status, device_info, attendance_method) VALUES (?,?,?,?,?)",
    [session.id, user.id, status, 'USSD Dial', 'ussd']
  )

  // Emit WebSocket event for live dashboard
  try {
    const io = require('../server').io
    if (io) {
      io.to(`session:${session.id}`).emit('student_scanned', {
        student_id: user.id,
        name: user.full_name,
        reg_number: user.student_reg_no,
        status,
        method: 'ussd',
        marked_at: new Date().toISOString()
      })
    }
  } catch { /* io might not be available */ }

  const timeStr = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
  return (
    `END Attendance Marked!\n` +
    `${user.full_name} — ${user.student_reg_no}\n` +
    `${session.unit_code || session.unit_name} | ${status === 'late' ? 'LATE' : 'PRESENT'} | ${timeStr}\n` +
    `\nUnlocking Infinite Possibilities`
  )
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

module.exports = router
