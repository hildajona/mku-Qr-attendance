const express = require('express')
const { pool, isAvailable } = require('../config/db')
const mock    = require('../config/mockData')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()

// GET /api/courses
router.get('/', authenticate, async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const [courses] = await db.query('SELECT * FROM courses ORDER BY name')
      for (const c of courses) {
        const [units] = await db.query(
          'SELECT u.*, COUNT(e.id) as students_count FROM units u LEFT JOIN enrollments e ON e.unit_id=u.id WHERE u.course_id=? GROUP BY u.id',
          [c.id]
        )
        c.units = units
      }
      return res.json({ courses })
    }
    const courses = mock.courses.map(c => ({
      ...c,
      students_count: mock.enrollments.filter(e => mock.units.find(u => u.id === e.unit_id && u.course_id === c.id)).length,
      units: mock.units
        .filter(u => u.course_id === c.id)
        .map(u => ({
          ...u,
          students_count: mock.enrollments.filter(e => e.unit_id === u.id).length,
        })),
    }))
    res.json({ courses })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/courses
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { name, code } = req.body
  if (!name || !code) return res.status(400).json({ message: 'Name and code required' })
  try {
    if (isAvailable()) {
      const db = pool()
      const [result] = await db.query('INSERT INTO courses (name,code,created_by) VALUES (?,?,?)', [name, code, req.user.id])
      return res.status(201).json({ id: result.insertId, message: 'Course created' })
    }
    if (mock.courses.find(c => c.code === code)) return res.status(409).json({ message: 'Course code already exists' })
    const id = mock.nextID('courses')
    mock.courses.push({ id, name, code, created_by: req.user.id, created_at: new Date().toISOString() })
    res.status(201).json({ id, message: 'Course created' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

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
      if (!assignments.length) {
        // If the database has not yet been seeded, fall back to the demo/mock lecturer assignments.
        const myUnitIds = mock.lecturerAssignments.filter(la => la.lecturer_id === req.user.id).map(la => la.unit_id)
        if (myUnitIds.length) {
          const myUnits = mock.units.filter(u => myUnitIds.includes(u.id))
          const courseMap = {}
          myUnits.forEach(u => {
            const course = mock.courses.find(c => c.id === u.course_id)
            if (!courseMap[u.course_id]) {
              courseMap[u.course_id] = { id: course?.id, name: course?.name, code: course?.code, units: [] }
            }
            courseMap[u.course_id].units.push({
              ...u,
              course_name: course?.name,
              students_count: mock.enrollments.filter(e => e.unit_id === u.id).length,
              sessions_count: mock.sessions.filter(s => s.unit_id === u.id && s.lecturer_id === req.user.id).length,
            })
          })
          return res.json({ courses: Object.values(courseMap) })
        }
      }
      const courseMap = {}
      assignments.forEach(u => {
        if (!courseMap[u.course_id]) courseMap[u.course_id] = { id: u.course_id, name: u.course_name, code: u.course_code, units: [] }
        courseMap[u.course_id].units.push(u)
      })
      return res.json({ courses: Object.values(courseMap) })
    }
    // Mock
    const myUnitIds = mock.lecturerAssignments.filter(la => la.lecturer_id === req.user.id).map(la => la.unit_id)
    const myUnits   = mock.units.filter(u => myUnitIds.includes(u.id))
    const courseMap = {}
    myUnits.forEach(u => {
      const course = mock.courses.find(c => c.id === u.course_id)
      if (!courseMap[u.course_id]) {
        courseMap[u.course_id] = { id: course?.id, name: course?.name, code: course?.code, units: [] }
      }
      courseMap[u.course_id].units.push({
        ...u,
        course_name: course?.name,
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
