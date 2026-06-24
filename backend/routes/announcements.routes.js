const express  = require('express')
const { authenticate, requireRole } = require('../middleware/auth')
const { pool, isAvailable } = require('../config/db')

const router = express.Router()

// GET /api/announcements  — get announcements visible to current user
router.get('/', authenticate, async (req, res) => {
  const { role, id } = req.user

  if (!isAvailable()) {
    return res.json({ announcements: [
      { id:1, title:'Server Maintenance Saturday 2am', body:'The system will be down for maintenance Saturday 26 May 2am–4am. Please plan accordingly.', priority:'urgent', target_role:'all', author:'Admin', created_at: new Date().toISOString(), expires_at: null },
      { id:2, title:'BCS301 CAT on Friday 9am', body:'Reminder: BCS301 CAT is this Friday at 9am in Lab 3. Attendance is mandatory.', priority:'normal', target_role:'students', author:'Dr. Kamau', created_at: new Date(Date.now()-3600000).toISOString(), expires_at: null },
    ]})
  }

  try {
    const [rows] = await pool.query(`
      SELECT a.id, a.title, a.body, a.priority, a.target_role, a.course_id,
             CONCAT(u.first_name,' ',u.last_name) AS author,
             a.created_at, a.expires_at
      FROM announcements a
      JOIN users u ON u.id = a.author_id
      WHERE (a.target_role = 'all' OR a.target_role = ?)
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
      ORDER BY a.priority DESC, a.created_at DESC
      LIMIT 20
    `, [role === 'admin' ? 'all' : role + 's'])
    res.json({ announcements: rows })
  } catch (err) {
    console.error('Announcements fetch error:', err)
    res.status(500).json({ message: 'Error loading announcements' })
  }
})

// POST /api/announcements  — admin or lecturer creates announcement
router.post('/', authenticate, async (req, res) => {
  const { title, body, target_role = 'all', priority = 'normal', course_id, expires_at } = req.body
  if (!title || !body) return res.status(400).json({ message: 'Title and body are required' })
  if (req.user.role === 'student') return res.status(403).json({ message: 'Students cannot post announcements' })

  if (!isAvailable()) {
    return res.status(201).json({ message: 'Announcement created (demo mode)', id: Date.now() })
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO announcements (title, body, author_id, target_role, priority, course_id, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, body, req.user.id, target_role, priority, course_id || null, expires_at || null]
    )
    res.status(201).json({ message: 'Announcement created', id: result.insertId })
  } catch (err) {
    console.error('Create announcement error:', err)
    res.status(500).json({ message: 'Error creating announcement' })
  }
})

// DELETE /api/announcements/:id  — admin can delete
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  if (!isAvailable()) return res.json({ message: 'Deleted (demo mode)' })
  try {
    await pool.query('DELETE FROM announcements WHERE id=?', [req.params.id])
    res.json({ message: 'Announcement deleted' })
  } catch (err) { res.status(500).json({ message: 'Delete error' }) }
})

module.exports = router
