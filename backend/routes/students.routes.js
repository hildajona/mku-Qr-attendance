/**
 * Bulk student import via CSV — supports 10,000+ rows
 * POST /api/students/import
 */
const express = require('express')
const multer  = require('multer')
const bcrypt  = require('bcryptjs')
const { pool, isAvailable } = require('../config/db')
const mock    = require('../config/mockData')
const { authenticate, requireRole } = require('../middleware/auth')

const router  = express.Router()
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// Parse CSV buffer manually (no external dep needed)
function parseCSV(buffer) {
  const text  = buffer.toString('utf8')
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+)(?=,|$)/g) || []
    const row  = {}
    headers.forEach((h, i) => {
      row[h] = (vals[i] || '').trim().replace(/^"|"$/g, '')
    })
    return row
  }).filter(r => r.name || r.reg_number)
}

// POST /api/students/import
router.post('/import', authenticate, requireRole('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No CSV file uploaded' })

  const rows = parseCSV(req.file.buffer)
  if (!rows.length) return res.status(400).json({ message: 'CSV is empty or malformed' })

  let imported = 0, skipped = 0, errors = []
  const BATCH = 100
  const defaultHash = await bcrypt.hash('student123', 10)

  if (isAvailable()) {
    const db = pool()
    // Process in batches of 100 for efficiency
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const values = []
      const params = []
      for (const row of batch) {
        if (!row.reg_number) { skipped++; continue }
        const hash = row.password ? await bcrypt.hash(row.password, 10) : defaultHash
        values.push('(UUID(), ?, ?, ?, ?, ?, ?, 1)')
        params.push(
          row.name || row.reg_number,
          row.email || null,
          hash,
          row.reg_number,
          row.course || null,
          'student'
        )
      }
      if (!values.length) continue
      try {
        const [result] = await db.query(
          `INSERT IGNORE INTO users (id, name, email, password_hash, reg_number, course, role, is_active)
           VALUES ${values.join(',')}`, params
        )
        imported += result.affectedRows
        skipped  += (batch.length - result.affectedRows)
      } catch (e) {
        errors.push(`Batch ${Math.floor(i/BATCH)+1}: ${e.message}`)
      }
    }
  } else {
    // Mock
    for (const row of rows) {
      if (!row.reg_number) { skipped++; continue }
      if (mock.users.find(u => u.reg_number === row.reg_number)) { skipped++; continue }
      const hash = row.password ? await bcrypt.hash(row.password, 10) : defaultHash
      const id   = mock.nextID('users')
      mock.users.push({
        id, name: row.name || row.reg_number, email: row.email || null,
        password_hash: hash, role: 'student', reg_number: row.reg_number,
        course: row.course || null, department: null, is_active: true,
        created_at: new Date().toISOString(),
      })
      imported++
    }
  }

  res.json({
    message: `Import complete: ${imported} added, ${skipped} skipped`,
    total: rows.length, imported, skipped,
    errors: errors.length ? errors : undefined,
  })
})

// GET /api/students — paginated list
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const { search, course, page = 1, limit = 50 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)
  try {
    if (isAvailable()) {
      const db = pool()
      let where = "WHERE role='student'"
      const p = []
      if (search) { where += ' AND (name LIKE ? OR reg_number LIKE ?)'; p.push(`%${search}%`, `%${search}%`) }
      if (course) { where += ' AND course LIKE ?'; p.push(`%${course}%`) }
      const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM users ${where}`, p)
      const [rows] = await db.query(
        `SELECT id, name, email, reg_number, course, is_active, created_at
         FROM users ${where} ORDER BY name LIMIT ? OFFSET ?`,
        [...p, parseInt(limit), offset]
      )
      return res.json({ students: rows, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
    }

    let list = mock.users.filter(u => u.role === 'student')
    if (search) list = list.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || (u.reg_number || '').includes(search))
    if (course) list = list.filter(u => (u.course || '').toLowerCase().includes(course.toLowerCase()))
    const total = list.length
    const paged = list.slice(offset, offset + parseInt(limit)).map(({ password_hash, ...u }) => u)
    res.json({ students: paged, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
