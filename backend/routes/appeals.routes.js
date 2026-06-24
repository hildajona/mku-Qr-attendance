const express = require('express')
const { pool, isAvailable } = require('../config/db')
const mock = require('../config/mockData')
const { authenticate, requireRole } = require('../middleware/auth')
const { auditLog } = require('../services/audit.service')
const router = express.Router()

// ─── STUDENT FILES APPEAL ────────────────────────────────────────────────────
// POST /api/appeals
router.post('/', authenticate, requireRole('student'), async (req, res) => {
  const { session_id, reason, evidence_url } = req.body
  if (!session_id || !reason) {
    return res.status(400).json({ message: 'Session ID and reason are required' })
  }

  try {
    if (isAvailable()) {
      const db = pool()
      // Check if student already appealed this session
      const [[existing]] = await db.query(
        'SELECT id FROM attendance_appeals WHERE student_id=? AND session_id=?',
        [req.user.id, session_id]
      )
      if (existing) {
        return res.status(400).json({ message: 'You have already submitted an appeal for this session.' })
      }

      await db.query(
        'INSERT INTO attendance_appeals (student_id, session_id, reason, evidence_url) VALUES (?,?,?,?)',
        [req.user.id, session_id, reason, evidence_url || null]
      )
      return res.status(201).json({ message: 'Appeal submitted successfully. Your lecturer will review it.' })
    }
    // Mock
    return res.status(201).json({ message: 'Appeal submitted successfully (Mock).' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── STUDENT LISTS OWN APPEALS ───────────────────────────────────────────────
// GET /api/appeals/student
router.get('/student', authenticate, requireRole('student'), async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [rows] = await db.query(`
        SELECT aa.*, s.started_at, u.name as unit_name, u.code as unit_code, uu.full_name as lecturer_name
        FROM attendance_appeals aa
        JOIN sessions s ON aa.session_id = s.id
        JOIN units u ON s.unit_id = u.id
        LEFT JOIN users uu ON s.lecturer_id = uu.id
        WHERE aa.student_id = ?
        ORDER BY aa.created_at DESC
      `, [req.user.id])
      return res.json({ appeals: rows })
    }
    return res.json({ appeals: [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── LECTURER LISTS APPEALS FOR REVIEW ────────────────────────────────────────
// GET /api/appeals/lecturer
router.get('/lecturer', authenticate, requireRole('lecturer'), async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [rows] = await db.query(`
        SELECT aa.*, s.started_at, u.name as unit_name, u.code as unit_code,
               uu.full_name as student_name, uu.reg_number
        FROM attendance_appeals aa
        JOIN sessions s ON aa.session_id = s.id
        JOIN units u ON s.unit_id = u.id
        JOIN users uu ON aa.student_id = uu.id
        WHERE s.lecturer_id = ? AND aa.status = 'pending'
        ORDER BY aa.created_at ASC
      `, [req.user.id])
      return res.json({ appeals: rows })
    }
    return res.json({ appeals: [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── LECTURER/ADMIN RESPONDS TO APPEAL ────────────────────────────────────────
// POST /api/appeals/:id/respond
router.post('/:id/respond', authenticate, async (req, res) => {
  const { id } = req.params
  const { status, review_note } = req.body // 'approved' or 'rejected'
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }

  try {
    if (isAvailable()) {
      const db = pool()
      const [[appeal]] = await db.query('SELECT * FROM attendance_appeals WHERE id=?', [id])
      if (!appeal) return res.status(404).json({ message: 'Appeal not found' })

      await db.query('START TRANSACTION')
      try {
        await db.query(
          'UPDATE attendance_appeals SET status=?, reviewed_by=?, review_note=? WHERE id=?',
          [status, req.user.id, review_note || null, id]
        )

        if (status === 'approved') {
          // Check if attendance record exists, update to present; else insert new
          const [[att]] = await db.query(
            'SELECT id FROM attendance WHERE session_id=? AND student_id=?',
            [appeal.session_id, appeal.student_id]
          )
          if (att) {
            await db.query(
              "UPDATE attendance SET status='present', device_info=CONCAT(COALESCE(device_info, ''), ' (Appealed)') WHERE id=?",
              [att.id]
            )
          } else {
            await db.query(
              "INSERT INTO attendance (session_id, student_id, status, device_info) VALUES (?,?,'present','Appealed')",
              [appeal.session_id, appeal.student_id]
            )
          }
        }

        await db.query('COMMIT')
        await auditLog({ userId: req.user.id, action: `APPEAL_${status.toUpperCase()}`, target: `appeal:${id}`, ip: req.ip })
        return res.json({ message: `Appeal ${status} successfully` })
      } catch (err) {
        await db.query('ROLLBACK')
        throw err
      }
    }
    return res.json({ message: 'Appeal updated (Mock)' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
