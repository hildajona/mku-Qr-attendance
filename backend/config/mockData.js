// Pre-hashed passwords (bcrypt, cost 10)
// admin123
const ADMIN_HASH    = '$2b$10$oqYAob00fCnR58QEtCE3sO4L34m0mRzHM15Ho72coAUdex75sfJne'
// lecturer123
const LECTURER_HASH = '$2b$10$L.uNmPw719M9zhScvOx0IOlVt7P1eAQXLSrK.Hg/xB7ZciiVvWyCG'
// student123
const STUDENT_HASH  = '$2b$10$KFt9bDHH4u1UACptDg9Xd.jhPWVUM2LI7Mtn9hH3pvPsMxyTmHowe'

const users = [
  {
    id: 1, name: 'System Admin', email: 'admin@mku.ac.ke',
    password_hash: ADMIN_HASH, role: 'admin',
    reg_number: null, course: null, department: 'Administration',
    is_active: true, created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2, name: 'Dr. James Mwangi', email: 'lecturer@mku.ac.ke',
    password_hash: LECTURER_HASH, role: 'lecturer',
    reg_number: null, course: null, department: 'Computer Science',
    is_active: true, created_at: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 3, name: 'Alice Wanjiku', email: 'alice@student.mku.ac.ke',
    password_hash: STUDENT_HASH, role: 'student',
    reg_number: 'SCT211-0001/2024', course: 'BSc Computer Science',
    department: null, is_active: true, created_at: '2024-01-03T00:00:00.000Z',
  },
  {
    id: 4, name: 'Brian Otieno', email: 'brian@student.mku.ac.ke',
    password_hash: STUDENT_HASH, role: 'student',
    reg_number: 'SCT211-0002/2024', course: 'BSc Computer Science',
    department: null, is_active: true, created_at: '2024-01-04T00:00:00.000Z',
  },
  {
    id: 5, name: 'Carol Muthoni', email: 'carol@student.mku.ac.ke',
    password_hash: STUDENT_HASH, role: 'student',
    reg_number: 'SCT211-0003/2024', course: 'BSc Information Technology',
    department: null, is_active: true, created_at: '2024-01-05T00:00:00.000Z',
  },
  {
    id: 6, name: 'Prof. Sarah Odhiambo', email: 'sarah@mku.ac.ke',
    password_hash: LECTURER_HASH, role: 'lecturer',
    reg_number: null, course: null, department: 'Mathematics',
    is_active: true, created_at: '2024-01-06T00:00:00.000Z',
  },
  {
    id: 7, name: 'David Kamau', email: 'david@student.mku.ac.ke',
    password_hash: STUDENT_HASH, role: 'student',
    reg_number: 'SCT211-0004/2024', course: 'BSc Computer Science',
    department: null, is_active: true, created_at: '2024-01-07T00:00:00.000Z',
  },
  {
    id: 8, name: 'Eve Njeri', email: 'eve@student.mku.ac.ke',
    password_hash: STUDENT_HASH, role: 'student',
    reg_number: 'SCT211-0005/2024', course: 'BSc Information Technology',
    department: null, is_active: true, created_at: '2024-01-08T00:00:00.000Z',
  },
]

const courses = [
  { id: 1, name: 'Bachelor of Science in Computer Science', code: 'BSC-CS', created_by: 1, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 2, name: 'Bachelor of Science in Information Technology', code: 'BSC-IT', created_by: 1, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 3, name: 'Bachelor of Science in Mathematics', code: 'BSC-MATH', created_by: 1, created_at: '2024-01-01T00:00:00.000Z' },
]

const units = [
  { id: 1, course_id: 1, name: 'Data Structures & Algorithms', code: 'SCS 201', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 2, course_id: 1, name: 'Database Systems', code: 'SCS 202', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 3, course_id: 1, name: 'Operating Systems', code: 'SCS 203', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 4, course_id: 2, name: 'Web Development', code: 'SIT 201', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 5, course_id: 2, name: 'Network Administration', code: 'SIT 202', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 6, course_id: 3, name: 'Calculus II', code: 'SMA 201', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 7, course_id: 3, name: 'Linear Algebra', code: 'SMA 202', created_at: '2024-01-01T00:00:00.000Z' },
]

const enrollments = [
  { id: 1, student_id: 3, unit_id: 1 },
  { id: 2, student_id: 3, unit_id: 2 },
  { id: 3, student_id: 3, unit_id: 3 },
  { id: 4, student_id: 4, unit_id: 1 },
  { id: 5, student_id: 4, unit_id: 2 },
  { id: 6, student_id: 5, unit_id: 4 },
  { id: 7, student_id: 5, unit_id: 5 },
  { id: 8, student_id: 7, unit_id: 1 },
  { id: 9, student_id: 7, unit_id: 2 },
  { id: 10, student_id: 8, unit_id: 4 },
]

const lecturerAssignments = [
  { id: 1, lecturer_id: 2, unit_id: 1 },
  { id: 2, lecturer_id: 2, unit_id: 2 },
  { id: 3, lecturer_id: 2, unit_id: 3 },
  { id: 4, lecturer_id: 6, unit_id: 6 },
  { id: 5, lecturer_id: 6, unit_id: 7 },
]

const now = Date.now()
const sessions = [
  {
    id: 1, unit_id: 1, lecturer_id: 2, room: 'LH-3',
    classroom_name: 'Lecture Hall 3', latitude: -0.416667, longitude: 36.950000, radius_meters: 100,
    started_at: new Date(now - 1800000).toISOString(),
    expires_at: new Date(now + 300000).toISOString(),
    duration_minutes: 60, qr_token: 'demo-active-token-001',
    qr_expiry_seconds: 300, is_active: true, ended_at: null,
  },
  {
    id: 2, unit_id: 2, lecturer_id: 2, room: 'Lab-2',
    classroom_name: 'Computer Lab 2', latitude: -0.417200, longitude: 36.949200, radius_meters: 100,
    started_at: new Date(now - 86400000).toISOString(),
    expires_at: new Date(now - 82800000).toISOString(),
    duration_minutes: 60, qr_token: 'demo-token-002',
    qr_expiry_seconds: 300, is_active: false,
    ended_at: new Date(now - 82800000).toISOString(),
  },
  {
    id: 3, unit_id: 1, lecturer_id: 2, room: 'LH-3',
    classroom_name: 'Lecture Hall 3', latitude: -0.416667, longitude: 36.950000, radius_meters: 100,
    started_at: new Date(now - 172800000).toISOString(),
    expires_at: new Date(now - 169200000).toISOString(),
    duration_minutes: 60, qr_token: 'demo-token-003',
    qr_expiry_seconds: 300, is_active: false,
    ended_at: new Date(now - 169200000).toISOString(),
  },
]

const attendance = [
  { id: 1, session_id: 1, student_id: 3, scanned_at: new Date(now - 1700000).toISOString(), status: 'present' },
  { id: 2, session_id: 1, student_id: 4, scanned_at: new Date(now - 1600000).toISOString(), status: 'present' },
  { id: 3, session_id: 2, student_id: 3, scanned_at: new Date(now - 86000000).toISOString(), status: 'present' },
  { id: 4, session_id: 2, student_id: 4, scanned_at: new Date(now - 85000000).toISOString(), status: 'late' },
  { id: 5, session_id: 3, student_id: 3, scanned_at: new Date(now - 172000000).toISOString(), status: 'present' },
  { id: 6, session_id: 3, student_id: 7, scanned_at: new Date(now - 171000000).toISOString(), status: 'present' },
]

const settings = {
  id: 1,
  university_name: 'Mount Kenya University',
  qr_expiry_seconds: 300,
  email_notifications: true,
  low_attendance_threshold: 75,
  allow_late_marking: true,
  late_threshold_minutes: 15,
}

const nextId = { users: 9, courses: 4, units: 8, enrollments: 11, sessions: 4, attendance: 7 }
function nextID(table) { return nextId[table]++ }

module.exports = {
  users, courses, units, enrollments, lecturerAssignments,
  sessions, attendance, settings, nextID,
}
