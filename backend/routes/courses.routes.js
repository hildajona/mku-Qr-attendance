const express = require('express')
const { pool, isAvailable } = require('../config/db')
const mock    = require('../config/mockData')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()

// ─── DEPARTMENTS ─────────────────────────────────────────────────────────────

// GET /api/courses/departments  — all departments with their courses + units
router.get('/departments', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [depts] = await db.query('SELECT * FROM departments ORDER BY name')
      for (const d of depts) {
        const [courses] = await db.query('SELECT * FROM courses WHERE department_id=? ORDER BY name', [d.id])
        for (const c of courses) {
          const [units] = await db.query(
            'SELECT u.*, COUNT(e.id) as students_count FROM units u LEFT JOIN enrollments e ON e.unit_id=u.id WHERE u.course_id=? GROUP BY u.id',
            [c.id]
          )
          c.units = units
          c.students_count = units.reduce((s, u) => s + (u.students_count || 0), 0)
        }
        d.courses = courses
      }
      return res.json({ departments: depts })
    }
    // Mock
    const departments = (mock.departments || []).map(d => ({
      ...d,
      courses: mock.courses
        .filter(c => c.department_id === d.id)
        .map(c => ({
          ...c,
          students_count: mock.enrollments.filter(e => mock.units.find(u => u.id === e.unit_id && u.course_id === c.id)).length,
          units: mock.units
            .filter(u => u.course_id === c.id)
            .map(u => ({ ...u, students_count: mock.enrollments.filter(e => e.unit_id === u.id).length })),
        })),
    }))
    res.json({ departments })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/courses/departments
router.post('/departments', authenticate, requireRole('admin'), async (req, res) => {
  const { name, code } = req.body
  if (!name || !code) return res.status(400).json({ message: 'Name and code required' })
  try {
    if (isAvailable()) {
      const db = pool()
      const [result] = await db.query('INSERT INTO departments (name, code) VALUES (?,?)', [name, code])
      return res.status(201).json({ id: result.insertId, message: 'Department created' })
    }
    if (mock.departments.find(d => d.code === code)) return res.status(409).json({ message: 'Department code already exists' })
    const id = mock.nextID('departments')
    mock.departments.push({ id, name, code, created_at: new Date().toISOString() })
    res.status(201).json({ id, message: 'Department created' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/courses/departments/:id
router.put('/departments/:id', authenticate, requireRole('admin'), async (req, res) => {
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

// DELETE /api/courses/departments/:id
router.delete('/departments/:id', authenticate, requireRole('admin'), async (req, res) => {
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

// ─── COURSES ─────────────────────────────────────────────────────────────────

// GET /api/courses
router.get('/', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [courses] = await db.query('SELECT c.*, d.name as department_name FROM courses c LEFT JOIN departments d ON d.id=c.department_id ORDER BY c.name')
      for (const c of courses) {
        const [units] = await db.query(
          'SELECT u.*, COUNT(e.id) as students_count FROM units u LEFT JOIN enrollments e ON e.unit_id=u.id WHERE u.course_id=? GROUP BY u.id',
          [c.id]
        )
        c.units = units
      }
      return res.json({ courses })
    }
    const courses = mock.courses.map(c => {
      const dept = mock.departments.find(d => d.id === c.department_id)
      return {
        ...c,
        department_name: dept?.name || '',
        students_count: mock.enrollments.filter(e => mock.units.find(u => u.id === e.unit_id && u.course_id === c.id)).length,
        units: mock.units
          .filter(u => u.course_id === c.id)
          .map(u => ({ ...u, students_count: mock.enrollments.filter(e => e.unit_id === u.id).length })),
      }
    })
    res.json({ courses })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/courses
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { name, code, department_id } = req.body
  if (!name || !code) return res.status(400).json({ message: 'Name and code required' })
  try {
    if (isAvailable()) {
      const db = pool()
      const [result] = await db.query('INSERT INTO courses (name,code,department_id,created_by) VALUES (?,?,?,?)',
        [name, code, department_id || null, req.user.id])
      return res.status(201).json({ id: result.insertId, message: 'Course created' })
    }
    if (mock.courses.find(c => c.code === code)) return res.status(409).json({ message: 'Course code already exists' })
    const id = mock.nextID('courses')
    mock.courses.push({ id, name, code, department_id: department_id ? parseInt(department_id) : null, created_by: req.user.id, created_at: new Date().toISOString() })
    res.status(201).json({ id, message: 'Course created' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/courses/:id
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { name, code, department_id } = req.body
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query('UPDATE courses SET name=COALESCE(?,name), code=COALESCE(?,code), department_id=COALESCE(?,department_id) WHERE id=?',
        [name, code, department_id, req.params.id])
      return res.json({ message: 'Course updated' })
    }
    const c = mock.courses.find(c => c.id === parseInt(req.params.id))
    if (c) { if (name) c.name = name; if (code) c.code = code; if (department_id) c.department_id = parseInt(department_id) }
    res.json({ message: 'Course updated' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/courses/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query('DELETE FROM courses WHERE id=?', [req.params.id])
      return res.json({ message: 'Course deleted' })
    }
    const idx = mock.courses.findIndex(c => c.id === parseInt(req.params.id))
    if (idx !== -1) mock.courses.splice(idx, 1)
    res.json({ message: 'Course deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── UNITS ────────────────────────────────────────────────────────────────────

// GET /api/courses/:id/units
router.get('/:id/units', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [units] = await db.query(
        'SELECT u.*, COUNT(e.id) as students_count FROM units u LEFT JOIN enrollments e ON e.unit_id=u.id WHERE u.course_id=? GROUP BY u.id',
        [req.params.id]
      )
      return res.json({ units })
    }
    const units = mock.units
      .filter(u => u.course_id === parseInt(req.params.id))
      .map(u => ({ ...u, students_count: mock.enrollments.filter(e => e.unit_id === u.id).length }))
    res.json({ units })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/courses/:id/units
router.post('/:id/units', authenticate, requireRole('admin'), async (req, res) => {
  const { name, code } = req.body
  if (!name || !code) return res.status(400).json({ message: 'Name and code required' })
  try {
    if (isAvailable()) {
      const db = pool()
      const [result] = await db.query('INSERT INTO units (course_id,name,code) VALUES (?,?,?)', [req.params.id, name, code])
      return res.status(201).json({ id: result.insertId, message: 'Unit created' })
    }
    const id = mock.nextID('units')
    mock.units.push({ id, course_id: parseInt(req.params.id), name, code, created_at: new Date().toISOString() })
    res.status(201).json({ id, message: 'Unit created' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/courses/:courseId/units/:unitId
router.put('/:courseId/units/:unitId', authenticate, requireRole('admin'), async (req, res) => {
  const { name, code } = req.body
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query('UPDATE units SET name=COALESCE(?,name), code=COALESCE(?,code) WHERE id=? AND course_id=?',
        [name, code, req.params.unitId, req.params.courseId])
      return res.json({ message: 'Unit updated' })
    }
    const u = mock.units.find(u => u.id === parseInt(req.params.unitId))
    if (u) { if (name) u.name = name; if (code) u.code = code }
    res.json({ message: 'Unit updated' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/courses/:courseId/units/:unitId
router.delete('/:courseId/units/:unitId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      await db.query('DELETE FROM units WHERE id=? AND course_id=?', [req.params.unitId, req.params.courseId])
      return res.json({ message: 'Unit deleted' })
    }
    const idx = mock.units.findIndex(u => u.id === parseInt(req.params.unitId))
    if (idx !== -1) mock.units.splice(idx, 1)
    res.json({ message: 'Unit deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── LECTURER COURSES ─────────────────────────────────────────────────────────

// GET /api/lecturer/courses  (mounted at /api/lecturer)
router.get('/courses', authenticate, requireRole('lecturer'), async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [assignments] = await db.query(
        `SELECT u.*, c.name as course_name, c.code as course_code, c.id as course_id,
                COUNT(DISTINCT e.student_id) as students_count,
                COUNT(DISTINCT s.id) as sessions_count
         FROM lecturer_assignments la
         JOIN units u ON u.id=la.unit_id
         JOIN courses c ON c.id=u.course_id
         LEFT JOIN enrollments e ON e.unit_id=u.id
         LEFT JOIN sessions s ON s.unit_id=u.id AND s.lecturer_id=la.lecturer_id
         WHERE la.lecturer_id=? GROUP BY u.id`,
        [req.user.id]
      )
      const courseMap = {}
      assignments.forEach(u => {
        if (!courseMap[u.course_id]) courseMap[u.course_id] = { id: u.course_id, name: u.course_name, code: u.course_code, units: [] }
        courseMap[u.course_id].units.push(u)
      })
      if (!assignments.length) {
        const myUnitIds = mock.lecturerAssignments.filter(la => la.lecturer_id === req.user.id).map(la => la.unit_id)
        if (myUnitIds.length) {
          const myUnits = mock.units.filter(u => myUnitIds.includes(u.id))
          myUnits.forEach(u => {
            const course = mock.courses.find(c => c.id === u.course_id)
            if (!courseMap[u.course_id]) courseMap[u.course_id] = { id: course?.id, name: course?.name, code: course?.code, units: [] }
            courseMap[u.course_id].units.push({ ...u, course_name: course?.name, students_count: mock.enrollments.filter(e => e.unit_id === u.id).length, sessions_count: 0 })
          })
        }
      }
      return res.json({ courses: Object.values(courseMap) })
    }
    const myUnitIds = mock.lecturerAssignments.filter(la => la.lecturer_id === req.user.id).map(la => la.unit_id)
    const myUnits   = mock.units.filter(u => myUnitIds.includes(u.id))
    const courseMap = {}
    myUnits.forEach(u => {
      const course = mock.courses.find(c => c.id === u.course_id)
      if (!courseMap[u.course_id]) courseMap[u.course_id] = { id: course?.id, name: course?.name, code: course?.code, units: [] }
      courseMap[u.course_id].units.push({
        ...u, course_name: course?.name,
        students_count: mock.enrollments.filter(e => e.unit_id === u.id).length,
        sessions_count: mock.sessions.filter(s => s.unit_id === u.id && s.lecturer_id === req.user.id).length,
      })
    })
    res.json({ courses: Object.values(courseMap) })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
