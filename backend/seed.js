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

  const roles = [
    { id: 1, name: 'super_admin', description: 'Full system access for MKU central administration' },
    { id: 2, name: 'school_admin', description: 'Manages departments, lecturers, students, and units within a school' },
    { id: 3, name: 'admin', description: 'System administrator with global privileges' },
    { id: 4, name: 'lecturer', description: 'Assigned lecturer who can generate QR attendance sessions' },
    { id: 5, name: 'hod', description: 'Head of Department with faculty and department oversight' },
    { id: 6, name: 'student', description: 'Student with attendance and report access' },
  ]

  const schools = [
    { id: 1, name: 'School of Computing and Informatics', code: 'SCI', campus: 'Thika Campus' },
    { id: 2, name: 'School of Business and Economics', code: 'SBE', campus: 'Thika Campus' },
    { id: 3, name: 'School of Education', code: 'SED', campus: 'Thika Campus' },
    { id: 4, name: 'School of Social Sciences', code: 'SSS', campus: 'Thika Campus' },
    { id: 5, name: 'School of Pure and Applied Sciences', code: 'SPAS', campus: 'Thika Campus' },
    { id: 6, name: 'School of Engineering, Energy and the Built Environment', code: 'SEEBE', campus: 'Thika Campus' },
    { id: 7, name: 'School of Law', code: 'SLW', campus: 'Thika Campus' },
    { id: 8, name: 'School of Nursing', code: 'SNRS', campus: 'Thika Campus' },
    { id: 9, name: 'School of Public Health', code: 'SPH', campus: 'Thika Campus' },
    { id: 10, name: 'School of Pharmacy', code: 'SPHARM', campus: 'Thika Campus' },
    { id: 11, name: 'School of Clinical Medicine', code: 'SCM', campus: 'Thika Campus' },
    { id: 12, name: 'Medical School', code: 'MED', campus: 'Thika Campus' },
  ]

  const departments = [
    { school_id: 1, name: 'Information Technology', code: 'IT' },
    { school_id: 1, name: 'Computer Science', code: 'CS' },
    { school_id: 1, name: 'Information Systems', code: 'IS' },
    { school_id: 2, name: 'Accounting', code: 'ACC' },
    { school_id: 2, name: 'Finance', code: 'FIN' },
    { school_id: 2, name: 'Marketing', code: 'MKT' },
    { school_id: 3, name: 'Early Childhood Education', code: 'ECE' },
    { school_id: 4, name: 'Sociology', code: 'SOC' },
    { school_id: 5, name: 'Mathematics', code: 'MATH' },
    { school_id: 6, name: 'Civil Engineering', code: 'CIV' },
    { school_id: 7, name: 'Law', code: 'LAW' },
    { school_id: 8, name: 'Nursing', code: 'NURS' },
    { school_id: 9, name: 'Public Health', code: 'PH' },
    { school_id: 10, name: 'Pharmacy', code: 'PHARM' },
    { school_id: 11, name: 'Clinical Medicine', code: 'MEDCL' },
    { school_id: 12, name: 'Medical Sciences', code: 'MEDSC' },
  ]

  const courses = [
    { id: 1, name: 'Bachelor of Science in Computer Science', code: 'BSC-CS', department_id: 2 },
    { id: 2, name: 'Bachelor of Science in Information Technology', code: 'BSC-IT', department_id: 1 },
    { id: 3, name: 'Bachelor of Science in Mathematics', code: 'BSC-MATH', department_id: 5 },
  ]

  const units = [
    { id: 1, course_id: 1, department_id: 2, name: 'Data Structures & Algorithms', code: 'SCS 201' },
    { id: 2, course_id: 1, department_id: 2, name: 'Database Systems', code: 'SCS 202' },
    { id: 3, course_id: 1, department_id: 2, name: 'Operating Systems', code: 'SCS 203' },
    { id: 4, course_id: 2, department_id: 1, name: 'Web Development', code: 'SIT 201' },
    { id: 5, course_id: 2, department_id: 1, name: 'Network Administration', code: 'SIT 202' },
    { id: 6, course_id: 3, department_id: 5, name: 'Calculus II', code: 'SMA 201' },
    { id: 7, course_id: 3, department_id: 5, name: 'Linear Algebra', code: 'SMA 202' },
  ]

  const users = [
    { id: 1, name: 'System Admin', email: 'admin@mku.ac.ke', password_hash: adminPass, role: 'admin', reg_number: null, course: null, department: 'Administration' },
    { id: 2, name: 'Dr. James Mwangi', email: 'lecturer@mku.ac.ke', password_hash: lecturerPass, role: 'lecturer', reg_number: null, course: null, department: 'Computer Science' },
    { id: 6, name: 'Dr. Grace Njeri', email: 'hod@cams.ac.ke', password_hash: lecturerPass, role: 'hod', reg_number: null, course: null, department: 'Computer Science', is_active: true, status: 'active' },
    { id: 3, name: 'Alice Wanjiku', email: 'alice@student.mku.ac.ke', password_hash: studentPass, role: 'student', reg_number: 'SCT211-0001/2024', course: 'BSc Computer Science', department: null },
    { id: 4, name: 'Brian Otieno', email: 'brian@student.mku.ac.ke', password_hash: studentPass, role: 'student', reg_number: 'SCT211-0002/2024', course: 'BSc Computer Science', department: null },
    { id: 5, name: 'Carol Muthoni', email: 'carol@student.mku.ac.ke', password_hash: studentPass, role: 'student', reg_number: 'SCT211-0003/2024', course: 'BSc Information Technology', department: null },
  ]

  const studentProfiles = [
    { user_id: 3, admission_number: 'SCT211-0001/2024', year_of_study: 2, current_semester: 2 },
    { user_id: 4, admission_number: 'SCT211-0002/2024', year_of_study: 2, current_semester: 2 },
    { user_id: 5, admission_number: 'SCT211-0003/2024', year_of_study: 2, current_semester: 2 },
  ]

  const lecturerProfiles = [
    { user_id: 2, employee_number: 'LK-1001', school_id: 1, department_id: 2, title: 'Senior Lecturer' },
  ]

  const studentRegistrations = [
    { student_id: 3, unit_id: 1, registration_year: '2025/2026', semester: 2 },
    { student_id: 3, unit_id: 2, registration_year: '2025/2026', semester: 2 },
    { student_id: 3, unit_id: 3, registration_year: '2025/2026', semester: 2 },
    { student_id: 4, unit_id: 1, registration_year: '2025/2026', semester: 2 },
    { student_id: 4, unit_id: 2, registration_year: '2025/2026', semester: 2 },
    { student_id: 5, unit_id: 4, registration_year: '2025/2026', semester: 2 },
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

  for (const role of roles) {
    await connection.execute(
      'INSERT IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)',
      [role.id, role.name, role.description]
    )
  }

  for (const school of schools) {
    await connection.execute(
      'INSERT IGNORE INTO schools (id, name, code, campus) VALUES (?, ?, ?, ?)',
      [school.id, school.name, school.code, school.campus]
    )
  }

  for (const department of departments) {
    await connection.execute(
      'INSERT IGNORE INTO departments (school_id, name, code) VALUES (?, ?, ?)',
      [department.school_id, department.name, department.code]
    )
  }

  for (const course of courses) {
    await connection.execute(
      'INSERT IGNORE INTO courses (id, name, code, department_id, created_by) VALUES (?, ?, ?, ?, ?)',
      [course.id, course.name, course.code, course.department_id, 1]
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
      `INSERT INTO users (id, full_name, email, password_hash, role, reg_number, course, department, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash), role = VALUES(role), department = VALUES(department), reg_number = VALUES(reg_number), course = VALUES(course), is_active = VALUES(is_active)`,
      [user.id, user.name, user.email, user.password_hash, user.role, user.reg_number, user.course, user.department]
    )
  }

  for (const student of studentProfiles) {
    await connection.execute(
      `INSERT IGNORE INTO students (id, user_id, admission_number, year_of_study, current_semester)
       VALUES (?, ?, ?, ?, ?)`,
      [student.user_id, student.user_id, student.admission_number, student.year_of_study, student.current_semester]
    )
  }

  for (const lecturer of lecturerProfiles) {
    await connection.execute(
      `INSERT IGNORE INTO lecturers (id, user_id, employee_number, school_id, department_id, title)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [lecturer.user_id, lecturer.user_id, lecturer.employee_number, lecturer.school_id, lecturer.department_id, lecturer.title]
    )
  }

  for (const registration of studentRegistrations) {
    await connection.execute(
      'INSERT IGNORE INTO enrollments (student_id, unit_id) VALUES (?, ?)',
      [registration.student_id, registration.unit_id]
    )
    await connection.execute(
      'INSERT IGNORE INTO student_units (student_id, unit_id, registration_year, semester) VALUES (?, ?, ?, ?)',
      [registration.student_id, registration.unit_id, registration.registration_year, registration.semester]
    )
  }

  for (const assignment of lecturerAssignments) {
    await connection.execute(
      'INSERT IGNORE INTO lecturer_assignments (lecturer_id, unit_id) VALUES (?, ?)',
      [assignment.lecturer_id, assignment.unit_id]
    )
    await connection.execute(
      'INSERT IGNORE INTO lecturer_units (lecturer_id, unit_id) VALUES (?, ?)',
      [assignment.lecturer_id, assignment.unit_id]
    )
  }

  for (const session of sessions) {
    await connection.execute(
      `INSERT IGNORE INTO sessions (id, unit_id, lecturer_id, room, classroom_name, lat, lng, radius_meters, started_at, expires_at, duration_minutes, qr_token, qr_token_hash, qr_expiry_seconds, is_active, ended_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.id, session.unit_id, session.lecturer_id, session.room, session.classroom_name, session.latitude, session.longitude, session.radius_meters, session.started_at, session.expires_at, session.duration_minutes, session.qr_token, session.qr_token_hash, session.qr_expiry_seconds, session.is_active, session.ended_at]
    )
    await connection.execute(
      `INSERT IGNORE INTO attendance_sessions (id, unit_id, lecturer_id, session_code, room, scheduled_date, start_time, end_time, qr_token, qr_expires_at, qr_expiry_seconds, status, latitude, longitude, gps_radius_meters)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [session.id, session.unit_id, session.lecturer_id, `SESSION-${session.id}`, session.room, session.started_at.split(' ')[0], session.started_at.split(' ')[1], session.expires_at.split(' ')[1], session.qr_token, session.expires_at, session.qr_expiry_seconds, session.latitude, session.longitude, session.radius_meters]
    )
  }

  for (const record of attendance) {
    await connection.execute(
      `INSERT IGNORE INTO attendance (session_id, student_id, scanned_at, status, ip_address, device_fingerprint)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [record.session_id, record.student_id, record.scanned_at, record.status, record.ip_address, record.device_info]
    )
    await connection.execute(
      `INSERT IGNORE INTO attendance_records (session_id, student_id, scanned_at, status, ip_address, attendance_method)
       VALUES (?, ?, ?, ?, ?, 'qr')`,
      [record.session_id, record.student_id, record.scanned_at, record.status, record.ip_address]
    )
  }

  console.log('Database seeded successfully.')
  await connection.end()
}

main().catch(err => {
  console.error('Seed error:', err)
  process.exit(1)
})
