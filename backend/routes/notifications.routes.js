const express  = require('express')
const { authenticate } = require('../middleware/auth')
const { pool, isAvailable } = require('../config/db')

const router = express.Router()

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  if (!isAvailable()) {
    return res.json({ notifications: [
      { id:1, type:'announcement',      title:'Server Maintenance', body:'Saturday 2am–4am system downtime.', created_at: new Date().toISOString(), is_read: false },
      { id:2, type:'low_attendance',    title:'Low Attendance Alert', body:'BCS303 attendance is 54%.', created_at: new Date(Date.now()-3600000).toISOString(), is_read: false },
      { id:3, type:'attendance_marked', title:'Attendance Marked', body:'Present in BCS301 today.', created_at: new Date(Date.now()-86400000).toISOString(), is_read: true },
    ]})
  }
  try {
    const [rows] = await pool.query(
      `SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    )
    res.json({ notifications: rows })
  } catch (err) {
    res.status(500).json({ message: 'Error loading notifications' })
  }
})

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req, res) => {
  if (!isAvailable()) return res.json({ count: 2 })
  try {
    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND is_read=0`,
      [req.user.id]
    )
    res.json({ count })
  } catch { res.json({ count: 0 }) }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
  if (!isAvailable()) return res.json({ message: 'Marked read (demo)' })
  try {
    await pool.query(
      `UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?`,
      [req.params.id, req.user.id]
    )
    res.json({ message: 'Marked read' })
  } catch { res.status(500).json({ message: 'Error' }) }
})

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, async (req, res) => {
  if (!isAvailable()) return res.json({ message: 'All marked read (demo)' })
  try {
    await pool.query(`UPDATE notifications SET is_read=1 WHERE user_id=?`, [req.user.id])
    res.json({ message: 'All notifications marked as read' })
  } catch { res.status(500).json({ message: 'Error' }) }
})

// POST /api/notifications  — internal: create notification for a user
router.post('/', authenticate, async (req, res) => {
  const { user_id, type, title, body } = req.body
  if (!isAvailable()) return res.status(201).json({ message: 'Created (demo)' })
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body) VALUES (?,?,?,?)`,
      [user_id, type, title, body]
    )
    res.status(201).json({ message: 'Notification created' })
  } catch { res.status(500).json({ message: 'Error creating notification' }) }
})

module.exports = router
