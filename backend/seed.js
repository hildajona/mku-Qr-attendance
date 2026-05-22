require('dotenv').config()
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mku_attendance',
  })

  console.log('Seeding MKU attendance database...')

  const adminPass = bcrypt.hashSync('admin123', 10)
  const lecturerPass = bcrypt.hashSync('lecturer123', 10)
  const studentPass = bcrypt.hashSync('student123', 10)

  const courses = [
    { id: 1, name: 'Bachelor of Science in Computer Science', code: 'BSC-CS' },
    { id: 2, name: 'Bachelor of Science in Information Technology', code: 'BSC-IT' },
    { id: 3, name: 'Bachelor of Science in Mathematics', code: 'BSC-MATH' },
  ]

  const units = [
    { id: 1, course_id: 1, name: 'Data Structures & Algorithms', code: 'SCS 201' },
    { id: 2, course_id: 1, name: 'Database Systems', code: 'SCS 202' },
    { id: 3, course_id: 1, name: 'Operating Systems', code: 'SCS 203' },
    { id: 4, course_id: 2, name: 'Web Development', code: 'SIT 201' },
    { id: 5, course_id: 2, name: 'Network Administration', code: 'SIT 202' },
    { id: 6, course_id: 3, name: 'Calculus II', code: 'SMA 201' },
    { id: 7, course_id: 3, name: 'Linear Algebra', code: 'SMA 202' },
  ]

  const users = [
    { id: 1, name: 'System Admin', email: 'admin@mku.ac.ke', password_hash: adminPass, role: 'admin', reg_number: null, course: null, department: 'Administration' },
    { id: 2, name: 'Dr. James Mwangi', email: 'lecturer@mku.ac.ke', password_hash: lecturerPass, role: 'lecturer', reg_number: null, course: null, department: 'Computer Science' },
    { id: 3, name: 'Alice Wanjiku', email: 'alice@student.mku.ac.ke', password_hash: studentPass, role: 'student', reg_number: 'SCT211-0001/2024', course: 'BSc Computer Science', department: null },
    { id: 4, name: 'Brian Otieno', email: 'brian@student.mku.ac.ke', password_hash: studentPass, role: 'student', reg_number: 'SCT211-0002/2024', course: 'BSc Computer Science', department: null },
    { id: 5, name: 'Carol Muthoni', email: 'carol@student.mku.ac.ke', password_hash: studentPass, role: 'student', reg_number: 'SCT211-0003/2024', course: 'BSc Information Technology', department: null },
  ]

  const enrollments = [
    { student_id: 3, unit_id: 1 },
    { student_id: 3, unit_id: 2 },
    { student_id: 3, unit_id: 3 },
    { student_id: 4, unit_id: 1 },
    { student_id: 4, unit_id: 2 },
    { student_id: 5, unit_id: 4 },
  ]

  const lecturerAssignments = [
    { lecturer_id: 2, unit_id: 1 },
    { lecturer_id: 2, unit_id: 2 },
    { lecturer_id: 2, unit_id: 3 },
  ]

  const sessionToken1 = crypto.randomUUID()
  const sessionToken2 = crypto.randomUUID()
  const sessionToken3 = crypto.randomUUID()

  const sessions = [
    {
      id: 1,
      unit_id: 1,
      lecturer_id: 2,
      room: 'LH-3',
      classroom_name: 'Lecture Hall 3',
      latitude: -0.416667,
      longitude: 36.950000,
      radius_meters: 100,
      started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      duration_minutes: 60,
      qr_token: sessionToken1,
      qr_token_hash: hashToken(sessionToken1),
      qr_expiry_seconds: 300,
      is_active: true,
      ended_at: null,
    },
    {
      id: 2,
      unit_id: 2,
      lecturer_id: 2,
      room: 'Lab-2',
      classroom_name: 'Computer Lab 2',
      latitude: -0.417200,
      longitude: 36.949200,
      radius_meters: 100,
      started_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      duration_minutes: 60,
      qr_token: sessionToken2,
      qr_token_hash: hashToken(sessionToken2),
      qr_expiry_seconds: 300,
      is_active: false,
      ended_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
    },
    {
      id: 3,
      unit_id: 1,
      lecturer_id: 2,
      room: 'LH-3',
      classroom_name: 'Lecture Hall 3',
      latitude: -0.416667,
      longitude: 36.950000,
      radius_meters: 100,
      started_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      expires_at: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      duration_minutes: 60,
      qr_token: sessionToken3,
      qr_token_hash: hashToken(sessionToken3),
      qr_expiry_seconds: 300,
      is_active: false,
      ended_at: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
    },
  ]

  const attendance = [
    { session_id: 1, student_id: 3, scanned_at: new Date(Date.now() - 28 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '), status: 'present', ip_address: '127.0.0.1', device_info: 'Seeded' },
    { session_id: 1, student_id: 4, scanned_at: new Date(Date.now() - 25 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '), status: 'present', ip_address: '127.0.0.1', device_info: 'Seeded' },
  ]

  await connection.execute('INSERT IGNORE INTO settings (id) VALUES (1)')

  for (const course of courses) {
    await connection.execute(
      'INSERT IGNORE INTO courses (id, name, code, created_by) VALUES (?, ?, ?, ?)',
      [course.id, course.name, course.code, 1]
    )
  }

  for (const unit of units) {
    await connection.execute(
      'INSERT IGNORE INTO units (id, course_id, name, code) VALUES (?, ?, ?, ?)',
      [unit.id, unit.course_id, unit.name, unit.code]
    )
  }

  for (const user of users) {
    await connection.execute(
      `INSERT INTO users (id, name, email, password_hash, role, reg_number, course, department, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), department = VALUES(department), reg_number = VALUES(reg_number), course = VALUES(course), is_active = VALUES(is_active)`,
      [user.id, user.name, user.email, user.password_hash, user.role, user.reg_number, user.course, user.department]
    )
  }

  for (const enrollment of enrollments) {
    await connection.execute(
      'INSERT IGNORE INTO enrollments (student_id, unit_id) VALUES (?, ?)',
      [enrollment.student_id, enrollment.unit_id]
    )
  }

  for (const assignment of lecturerAssignments) {
    await connection.execute(
      'INSERT IGNORE INTO lecturer_assignments (lecturer_id, unit_id) VALUES (?, ?)',
      [assignment.lecturer_id, assignment.unit_id]
    )
  }

  for (const session of sessions) {
    await connection.execute(
      `INSERT IGNORE INTO sessions (id, unit_id, lecturer_id, room, classroom_name, latitude, longitude, radius_meters, started_at, expires_at, duration_minutes, qr_token, qr_token_hash, qr_expiry_seconds, is_active, ended_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.id, session.unit_id, session.lecturer_id, session.room, session.classroom_name, session.latitude, session.longitude, session.radius_meters, session.started_at, session.expires_at, session.duration_minutes, session.qr_token, session.qr_token_hash, session.qr_expiry_seconds, session.is_active, session.ended_at]
    )
  }

  for (const record of attendance) {
    await connection.execute(
      `INSERT IGNORE INTO attendance (session_id, student_id, scanned_at, status, ip_address, device_info)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [record.session_id, record.student_id, record.scanned_at, record.status, record.ip_address, record.device_info]
    )
  }

  console.log('Database seeded successfully.')
  await connection.end()
}

main().catch(err => {
  console.error('Seed error:', err)
  process.exit(1)
})
