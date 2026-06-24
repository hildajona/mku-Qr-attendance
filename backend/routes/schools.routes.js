const express = require('express')
const { pool, isAvailable } = require('../config/db')
const mock    = require('../config/mockData')
const { authenticate, requireRole } = require('../middleware/auth')

const router  = express.Router()
const isAdmin = [authenticate, requireRole('admin')]

// ── GET /api/schools  (all schools with dept + course counts) ──────────────
router.get('/', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [schools] = await db.query(`
        SELECT s.*, COUNT(DISTINCT d.id) as dept_count,
               COUNT(DISTINCT c.id) as course_count
        FROM schools s
        LEFT JOIN departments d ON d.school_id = s.id
        LEFT JOIN courses c ON c.department_id = d.id
        GROUP BY s.id ORDER BY s.name`)
      return res.json({ schools })
    }
    const schools = mock.schools.map(s => ({
      ...s,
      dept_count:   mock.departments.filter(d => d.school_id === s.id).length,
      course_count: mock.courses.filter(c => {
        const dept = mock.departments.find(d => d.id === c.department_id)
        return dept?.school_id === s.id
      }).length,
    }))
    res.json({ schools })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/schools ──────────────────────────────────────────────────────
router.post('/', isAdmin, async (req, res) => {
  const { name, code } = req.body
  if (!name || !code) return res.status(400).json({ message: 'Name and code required' })
  try {
    if (isAvailable()) {
      const db = pool()
      const [r] = await db.query('INSERT INTO schools (name, code) VALUES (?,?)', [name, code])
      return res.status(201).json({ id: r.insertId, message: 'School created' })
    }
    if (mock.schools.find(s => s.code === code)) return res.status(409).json({ message: 'Code already exists' })
    const id = mock.nextID('schools')
    mock.schools.push({ id, name, code, created_at: new Date().toISOString() })
    res.status(201).json({ id, message: 'School created' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUT /api/schools/:id ───────────────────────────────────────────────────
router.put('/:id', isAdmin, async (req, res) => {
  const { name, code } = req.body
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query('UPDATE schools SET name=COALESCE(?,name), code=COALESCE(?,code) WHERE id=?', [name, code, req.params.id])
      return res.json({ message: 'School updated' })
    }
    const s = mock.schools.find(s => s.id === parseInt(req.params.id))
    if (s) { if (name) s.name = name; if (code) s.code = code }
    res.json({ message: 'School updated' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── DELETE /api/schools/:id ────────────────────────────────────────────────
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query('DELETE FROM schools WHERE id=?', [req.params.id])
      return res.json({ message: 'School deleted' })
    }
    const idx = mock.schools.findIndex(s => s.id === parseInt(req.params.id))
    if (idx !== -1) mock.schools.splice(idx, 1)
    res.json({ message: 'School deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/schools/:id/departments ──────────────────────────────────────
router.get('/:id/departments', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [depts] = await db.query(`
        SELECT d.*, COUNT(DISTINCT c.id) as course_count
        FROM departments d
        LEFT JOIN courses c ON c.department_id = d.id
        WHERE d.school_id=? GROUP BY d.id ORDER BY d.name`, [req.params.id])
      return res.json({ departments: depts })
    }
    const depts = mock.departments
      .filter(d => d.school_id === parseInt(req.params.id))
      .map(d => ({ ...d, course_count: mock.courses.filter(c => c.department_id === d.id).length }))
    res.json({ departments: depts })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/schools/all/departments  (all depts across all schools) ───────
router.get('/all/departments', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [depts] = await db.query(`
        SELECT d.*, s.name as school_name, s.code as school_code,
               COUNT(DISTINCT c.id) as course_count
        FROM departments d
        JOIN schools s ON s.id = d.school_id
        LEFT JOIN courses c ON c.department_id = d.id
        GROUP BY d.id ORDER BY s.name, d.name`)
      return res.json({ departments: depts })
    }
    const depts = mock.departments.map(d => {
      const school = mock.schools.find(s => s.id === d.school_id)
      return {
        ...d,
        school_name:  school?.name,
        school_code:  school?.code,
        course_count: mock.courses.filter(c => c.department_id === d.id).length,
      }
    })
    res.json({ departments: depts })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/schools/:id/departments ─────────────────────────────────────
router.post('/:id/departments', isAdmin, async (req, res) => {
  const { name, code } = req.body
  const schoolId = parseInt(req.params.id)
  if (!name || !code) return res.status(400).json({ message: 'Name and code required' })
  try {
    if (isAvailable()) {
      const db = pool()
      const [r] = await db.query('INSERT INTO departments (school_id, name, code) VALUES (?,?,?)', [schoolId, name, code])
      return res.status(201).json({ id: r.insertId, message: 'Department created' })
    }
    const id = mock.nextID('departments')
    mock.departments.push({ id, school_id: schoolId, name, code, created_at: new Date().toISOString() })
    res.status(201).json({ id, message: 'Department created' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── PUT /api/schools/departments/:id ──────────────────────────────────────
router.put('/departments/:id', isAdmin, async (req, res) => {
  const { name, code } = req.body
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query('UPDATE departments SET name=COALESCE(?,name), code=COALESCE(?,code) WHERE id=?', [name, code, req.params.id])
      return res.json({ message: 'Department updated' })
    }
    const d = mock.departments.find(d => d.id === parseInt(req.params.id))
    if (d) { if (name) d.name = name; if (code) d.code = code }
    res.json({ message: 'Department updated' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── DELETE /api/schools/departments/:id ───────────────────────────────────
router.delete('/departments/:id', isAdmin, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query('DELETE FROM departments WHERE id=?', [req.params.id])
      return res.json({ message: 'Department deleted' })
    }
    const idx = mock.departments.findIndex(d => d.id === parseInt(req.params.id))
    if (idx !== -1) mock.departments.splice(idx, 1)
    res.json({ message: 'Department deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ── GET /api/schools/departments/:id/courses ──────────────────────────────
router.get('/departments/:id/courses', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [crs] = await db.query(`
        SELECT c.*, COUNT(DISTINCT u.id) as unit_count
        FROM courses c LEFT JOIN units u ON u.course_id = c.id
        WHERE c.department_id=? GROUP BY c.id ORDER BY c.name`, [req.params.id])
      return res.json({ courses: crs })
    }
    const crs = mock.courses
      .filter(c => c.department_id === parseInt(req.params.id))
      .map(c => ({ ...c, unit_count: mock.units.filter(u => u.course_id === c.id).length }))
    res.json({ courses: crs })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
