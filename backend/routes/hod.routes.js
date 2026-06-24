const express = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { pool, isAvailable } = require('../config/db')
const mock = require('../config/mockData')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()

const toText = (value) => String(value || '').trim().toLowerCase()

async function findDepartment(db, user) {
  const deptName = toText(user.department)
  let department = null
  if (user.department_id) {
    const [rows] = await db.query('SELECT * FROM departments WHERE id=? LIMIT 1', [user.department_id])
    if (rows.length) department = rows[0]
  }
  if (!department && deptName) {
    const [rows] = await db.query(
      'SELECT * FROM departments WHERE LOWER(name)=? OR LOWER(code)=? LIMIT 1',
      [deptName, deptName]
    )
    if (rows.length) department = rows[0]
  }
  return department
}

async function findDepartmentAndSchool(db, user) {
  const department = await findDepartment(db, user)
  if (!department) return { department: null, school: null }

  const [schoolRows] = await db.query('SELECT * FROM schools WHERE id=? LIMIT 1', [department.school_id])
  return { department, school: schoolRows[0] || null }
}

async function fetchDepartmentOverview(db, department) {
  const [studentsRows] = await db.query(
    `SELECT COUNT(DISTINCT u.id) AS total
     FROM users u
     LEFT JOIN students s ON s.user_id=u.id
     WHERE u.role='student'
       AND (LOWER(u.department)=? OR LOWER(s.department)=?)`,
    [department.name.toLowerCase(), department.name.toLowerCase()]
  )

  const [facultyRows] = await db.query(
    `SELECT COUNT(DISTINCT u.id) AS total
     FROM users u
     WHERE u.role='lecturer'
       AND LOWER(u.department)=?`,
    [department.name.toLowerCase()]
  )

  const [coursesRows] = await db.query(
    'SELECT id, name, code FROM courses WHERE department_id=? ORDER BY name',
    [department.id]
  )

  const [unitsRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM units u
     JOIN courses c ON c.id=u.course_id
     WHERE c.department_id=?`,
    [department.id]
  )

  const [activeSessionRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM sessions s
     JOIN units u ON u.id = s.unit_id
     JOIN courses c ON c.id = u.course_id
     WHERE c.department_id=? AND s.is_active=1`,
    [department.id]
  )

  const [attendanceRows] = await db.query(
    `SELECT COALESCE(ROUND(
       SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)
       / NULLIF(COUNT(a.id),0) * 100, 1), 0) AS average_attendance
     FROM attendance a
     JOIN sessions s ON s.id = a.session_id
     JOIN units u ON u.id = s.unit_id
     JOIN courses c ON c.id = u.course_id
     WHERE c.department_id=?`,
    [department.id]
  )

  const [courseSummaries] = await db.query(
    `SELECT c.id, c.name, c.code,
            COUNT(DISTINCT u.id) AS units_count,
            COUNT(DISTINCT e.student_id) AS students_count
     FROM courses c
     LEFT JOIN units u ON u.course_id=c.id
     LEFT JOIN enrollments e ON e.unit_id=u.id
     WHERE c.department_id=?
     GROUP BY c.id
     ORDER BY c.name`,
    [department.id]
  )

  const [recentSessions] = await db.query(
    `SELECT s.id, u.name AS unit_name, u.code AS unit_code,
            s.room, l.full_name AS lecturer_name,
            s.is_active, s.started_at,
            COUNT(DISTINCT a.student_id) AS students_present
     FROM sessions s
     JOIN units u ON u.id = s.unit_id
     JOIN courses c ON c.id = u.course_id
     LEFT JOIN users l ON l.id = s.lecturer_id
     LEFT JOIN attendance a ON a.session_id = s.id AND a.status IN ('present','late')
     WHERE c.department_id=?
     GROUP BY s.id
     ORDER BY s.started_at DESC
     LIMIT 6`,
    [department.id]
  )

  const [lowAttendanceRows] = await db.query(
    `SELECT u.id, u.name, u.code,
            COALESCE(ROUND(
              SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)
              / NULLIF(COUNT(a.id),0) * 100, 1), 0) AS attendance_percent
     FROM units u
     JOIN courses c ON c.id = u.course_id
     LEFT JOIN sessions s ON s.unit_id = u.id AND s.ended_at IS NOT NULL
     LEFT JOIN attendance a ON a.session_id = s.id
     WHERE c.department_id=?
     GROUP BY u.id
     ORDER BY attendance_percent ASC, u.name
     LIMIT 5`,
    [department.id]
  )

  const [lecturersRows] = await db.query(
    `SELECT u.id, u.full_name AS name, u.email, u.phone, u.department, l.title,
            s.name AS school_name,
            COUNT(DISTINCT la.unit_id) AS assigned_units
     FROM users u
     LEFT JOIN lecturers l ON l.user_id = u.id
     LEFT JOIN schools s ON s.id = l.school_id
     LEFT JOIN lecturer_assignments la ON la.lecturer_id = u.id
     WHERE u.role='lecturer' AND LOWER(u.department)=?
     GROUP BY u.id
     ORDER BY u.full_name`,
    [department.name.toLowerCase()]
  )

  const overview = {
    department: department.name,
    stats: {
      courses: coursesRows.length,
      units: unitsRows[0]?.total || 0,
      students: studentsRows[0]?.total || 0,
      active_sessions: activeSessionRows[0]?.total || 0,
      faculty: facultyRows[0]?.total || 0,
      avg_attendance: parseFloat(attendanceRows[0]?.average_attendance || 0),
    },
    courses: courseSummaries.map((course) => ({
      ...course,
      avg_attendance: 0,
    })),
    lecturers: lecturersRows,
    recent_sessions: recentSessions,
    low_attendance_units: lowAttendanceRows.map((unit) => ({
      ...unit,
      status: unit.attendance_percent < 75 ? 'At risk' : 'Healthy',
    })),
    attendance_by_unit: lowAttendanceRows,
    trend: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      present: [78, 82, 77, 80, 84, 79, 81],
      absent: [22, 18, 23, 20, 16, 21, 19],
    },
  }

  return overview
}

function buildMockOverview(user) {
  const departmentName = user.department || 'Computer Science'
  const department = mock.departments.find((d) => toText(d.name) === toText(departmentName)) || mock.departments[0]
  const departmentCourses = mock.courses.filter((c) => c.department_id === department.id)
  const departmentUnits = mock.units.filter((u) => departmentCourses.some((c) => c.id === u.course_id))
  const departmentStudents = mock.users.filter((u) => u.role === 'student' && toText(u.department) === toText(department.name)).length
  const departmentLecturers = mock.users.filter((u) => u.role === 'lecturer' && toText(u.department) === toText(department.name))

  const courseSummaries = departmentCourses.map((course) => ({
    id: course.id,
    code: course.code,
    name: course.name,
    units_count: mock.units.filter((u) => u.course_id === course.id).length,
    students_count: mock.enrollments.filter((e) => mock.units.some((u) => u.id === e.unit_id && u.course_id === course.id)).length,
    avg_attendance: Math.round(65 + Math.random() * 30),
  }))

  const lowAttendanceUnits = departmentUnits.slice(0, 4).map((unit, index) => ({
    id: unit.id,
    code: unit.code,
    name: unit.name,
    attendance_percent: 60 + index * 7,
    status: index < 2 ? 'At risk' : 'Healthy',
  }))

  const school = mock.schools.find((s) => s.id === department.school_id)
  const lecturers = departmentLecturers.map((lecturer) => ({
    id: lecturer.id,
    name: lecturer.name,
    email: lecturer.email,
    phone: lecturer.phone || 'N/A',
    department: lecturer.department,
    school: school?.name || 'Unknown School',
    title: 'Senior Lecturer',
    assigned_units: mock.lecturerAssignments.filter((la) => la.lecturer_id === lecturer.id).length,
  }))

  return {
    department: department.name,
    stats: {
      courses: departmentCourses.length,
      units: departmentUnits.length,
      students: departmentStudents,
      active_sessions: 2,
      faculty: lecturers.length,
      avg_attendance: 77,
    },
    courses: courseSummaries,
    lecturers,
    recent_sessions: [
      { id: 1, unit_code: 'SCS 201', unit_name: 'Data Structures', room: 'LH-3', lecturer: 'Dr. James Mwangi', status: 'Active', students_present: 42, started_at: new Date(Date.now() - 20 * 60000).toISOString() },
      { id: 2, unit_code: 'SCS 202', unit_name: 'Database Systems', room: 'Lab-2', lecturer: 'Dr. James Mwangi', status: 'Closed', students_present: 38, started_at: new Date(Date.now() - 26 * 3600000).toISOString() },
    ],
    low_attendance_units: lowAttendanceUnits,
    attendance_by_unit: lowAttendanceUnits,
    trend: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      present: [72, 78, 80, 75, 82, 79, 81],
      absent: [28, 22, 20, 25, 18, 21, 19],
    },
  }
}

router.post('/lecturers', authenticate, requireRole('hod'), async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required to invite a lecturer.' })
  }

  try {
    const lecturerPassword = password || 'lecturer123'
    const hashedPassword = await bcrypt.hash(lecturerPassword, 10)

    if (isAvailable()) {
      const db = pool()
      const [existing] = await db.query('SELECT id FROM users WHERE email=? LIMIT 1', [email.trim().toLowerCase()])
      if (existing.length) return res.status(409).json({ message: 'A user with that email already exists.' })

      const { department, school } = await findDepartmentAndSchool(db, req.user)
      if (!department) {
        return res.status(400).json({ message: 'Unable to determine your department for the new lecturer.' })
      }

      const userId = crypto.randomUUID()
      await db.query(
        'INSERT INTO users (id, full_name, email, password_hash, role, department, status, is_active) VALUES (?,?,?,?,?,?,?,?)',
        [userId, name.trim(), email.trim().toLowerCase(), hashedPassword, 'lecturer', department.name, 'active', 1]
      )

      await db.query(
        'INSERT INTO lecturers (id, user_id, employee_number, school_id, department_id, title) VALUES (?,?,?,?,?,?)',
        [crypto.randomUUID(), userId, `LECT-${Date.now()}`, school?.id || null, department.id, 'Lecturer']
      )

      return res.status(201).json({ id: userId, message: 'Lecturer invited successfully.' })
    }

    if (mock.users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase())) {
      return res.status(409).json({ message: 'A user with that email already exists.' })
    }
    const department = mock.departments.find((d) => toText(d.name) === toText(req.user.department)) || mock.departments[0]
    const school = mock.schools.find((s) => s.id === department.school_id)
    const id = mock.nextID('users')
    mock.users.push({
      id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hashedPassword,
      role: 'lecturer',
      reg_number: null,
      course: null,
      department: department.name,
      department_id: department.id,
      school_id: school?.id,
      school: school?.name,
      is_active: true,
      status: 'active',
      created_at: new Date().toISOString(),
    })
    return res.status(201).json({ id, message: 'Lecturer invited successfully.' })
  } catch (err) {
    console.error('HOD invite lecturer error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/overview', authenticate, requireRole('hod'), async (req, res) => {
  try {
    if (isAvailable()) {
      const db = pool()
      const department = await findDepartment(db, req.user)
      if (!department) {
        return res.status(404).json({ message: 'Unable to resolve your department. Please verify your account department.' })
      }
      const overview = await fetchDepartmentOverview(db, department)
      return res.json(overview)
    }
    const overview = buildMockOverview(req.user)
    return res.json(overview)
  } catch (err) {
    console.error('HOD overview error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
