// Pre-hashed passwords (bcrypt, cost 10)
// admin123
const ADMIN_HASH    = '$2b$10$oqYAob00fCnR58QEtCE3sO4L34m0mRzHM15Ho72coAUdex75sfJne'
// lecturer123
const LECTURER_HASH = '$2b$10$L.uNmPw719M9zhScvOx0IOlVt7P1eAQXLSrK.Hg/xB7ZciiVvWyCG'
// student123
const STUDENT_HASH  = '$2b$10$KFt9bDHH4u1UACptDg9Xd.jhPWVUM2LI7Mtn9hH3pvPsMxyTmHowe'

// ── MKU Schools ───────────────────────────────────────────────────────────────
const schools = [
  { id: 1, name: 'School of Computing and Informatics',              code: 'SCI',  created_at: '2024-01-01T00:00:00.000Z' },
  { id: 2, name: 'School of Business and Economics',                 code: 'SBE',  created_at: '2024-01-01T00:00:00.000Z' },
  { id: 3, name: 'School of Education',                              code: 'SOE',  created_at: '2024-01-01T00:00:00.000Z' },
  { id: 4, name: 'School of Pure and Applied Sciences',              code: 'SPAS', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 5, name: 'School of Engineering, Energy and Built Environment', code: 'SEEBE', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 6, name: 'School of Law',                                    code: 'SOL',  created_at: '2024-01-01T00:00:00.000Z' },
  { id: 7, name: 'School of Nursing',                                code: 'SON',  created_at: '2024-01-01T00:00:00.000Z' },
  { id: 8, name: 'School of Public Health',                          code: 'SPH',  created_at: '2024-01-01T00:00:00.000Z' },
  { id: 9, name: 'School of Social Sciences',                        code: 'SSS',  created_at: '2024-01-01T00:00:00.000Z' },
]

// ── MKU Departments ────────────────────────────────────────────────────────────
const departments = [
  // School of Computing and Informatics
  { id: 1, school_id: 1, name: 'Computer Science',       code: 'CS',  created_at: '2024-01-01T00:00:00.000Z' },
  { id: 2, school_id: 1, name: 'Information Technology', code: 'IT',  created_at: '2024-01-01T00:00:00.000Z' },
  { id: 3, school_id: 1, name: 'Information Systems',    code: 'IS',  created_at: '2024-01-01T00:00:00.000Z' },
  // School of Business and Economics
  { id: 4, school_id: 2, name: 'Business Administration', code: 'BA', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 5, school_id: 2, name: 'Economics',               code: 'ECO', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 6, school_id: 2, name: 'Accounting and Finance',  code: 'AF',  created_at: '2024-01-01T00:00:00.000Z' },
  // School of Pure and Applied Sciences
  { id: 7, school_id: 4, name: 'Mathematics and Actuarial Science', code: 'MAS', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 8, school_id: 4, name: 'Physics',   code: 'PHY', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 9, school_id: 4, name: 'Chemistry', code: 'CHE', created_at: '2024-01-01T00:00:00.000Z' },
  // School of Nursing
  { id: 10, school_id: 7, name: 'Nursing Science', code: 'NS', created_at: '2024-01-01T00:00:00.000Z' },
  // School of Public Health
  { id: 11, school_id: 8, name: 'Public Health', code: 'PH', created_at: '2024-01-01T00:00:00.000Z' },
  // School of Education
  { id: 12, school_id: 3, name: 'Education and Teacher Training', code: 'ETT', created_at: '2024-01-01T00:00:00.000Z' },
  // School of Engineering
  { id: 13, school_id: 5, name: 'Electrical and Electronics Engineering', code: 'EEE', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 14, school_id: 5, name: 'Civil and Structural Engineering',       code: 'CSE', created_at: '2024-01-01T00:00:00.000Z' },
  // School of Law
  { id: 15, school_id: 6, name: 'Law', code: 'LAW', created_at: '2024-01-01T00:00:00.000Z' },
  // School of Social Sciences
  { id: 16, school_id: 9, name: 'Sociology and Anthropology', code: 'SA', created_at: '2024-01-01T00:00:00.000Z' },
  { id: 17, school_id: 9, name: 'Psychology',                 code: 'PSY', created_at: '2024-01-01T00:00:00.000Z' },
]

// ── MKU Courses ────────────────────────────────────────────────────────────────
const courses = [
  // Computer Science dept
  { id: 1, department_id: 1, name: 'Bachelor of Science in Computer Science',       code: 'BSC-CS',   created_by: 1, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 2, department_id: 2, name: 'Bachelor of Science in Information Technology', code: 'BSC-IT',   created_by: 1, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 3, department_id: 3, name: 'Bachelor of Science in Information Systems',    code: 'BSC-IS',   created_by: 1, created_at: '2024-01-01T00:00:00.000Z' },
  // Business
  { id: 4, department_id: 4, name: 'Bachelor of Business Administration',           code: 'BBA',      created_by: 1, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 5, department_id: 6, name: 'Bachelor of Commerce in Accounting',            code: 'BCOM-ACC', created_by: 1, created_at: '2024-01-01T00:00:00.000Z' },
  // Sciences
  { id: 6, department_id: 7, name: 'Bachelor of Science in Mathematics',            code: 'BSC-MATH', created_by: 1, created_at: '2024-01-01T00:00:00.000Z' },
  // Nursing
  { id: 7, department_id: 10, name: 'Bachelor of Science in Nursing',               code: 'BSC-NUR',  created_by: 1, created_at: '2024-01-01T00:00:00.000Z' },
  // Public Health
  { id: 8, department_id: 11, name: 'Bachelor of Science in Public Health',         code: 'BSC-PH',   created_by: 1, created_at: '2024-01-01T00:00:00.000Z' },
  // Law
  { id: 9, department_id: 15, name: 'Bachelor of Laws',                             code: 'LLB',      created_by: 1, created_at: '2024-01-01T00:00:00.000Z' },
]

// ── MKU Units ──────────────────────────────────────────────────────────────────
const units = [
  // BSc Computer Science units
  { id: 1,  course_id: 1, name: 'Data Structures & Algorithms',  code: 'SCS 201', year: 2, semester: 1, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 2,  course_id: 1, name: 'Database Systems',              code: 'SCS 202', year: 2, semester: 1, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 3,  course_id: 1, name: 'Operating Systems',             code: 'SCS 203', year: 2, semester: 2, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 4,  course_id: 1, name: 'Software Engineering',          code: 'SCS 301', year: 3, semester: 1, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 5,  course_id: 1, name: 'Computer Networks',             code: 'SCS 302', year: 3, semester: 1, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
  // BSc IT units
  { id: 6,  course_id: 2, name: 'Web Development',               code: 'SIT 201', year: 2, semester: 1, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 7,  course_id: 2, name: 'Network Administration',        code: 'SIT 202', year: 2, semester: 1, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 8,  course_id: 2, name: 'Cybersecurity Fundamentals',    code: 'SIT 301', year: 3, semester: 1, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
  // BSc Maths units
  { id: 9,  course_id: 6, name: 'Calculus II',                   code: 'SMA 201', year: 2, semester: 1, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 10, course_id: 6, name: 'Linear Algebra',                code: 'SMA 202', year: 2, semester: 1, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
  // BBA units
  { id: 11, course_id: 4, name: 'Principles of Management',      code: 'SBA 201', year: 2, semester: 1, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 12, course_id: 4, name: 'Business Finance',              code: 'SBA 202', year: 2, semester: 1, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
  // BSc Nursing units
  { id: 13, course_id: 7, name: 'Anatomy and Physiology',        code: 'SNR 201', year: 2, semester: 1, credit_hours: 4, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 14, course_id: 7, name: 'Pharmacology',                  code: 'SNR 202', year: 2, semester: 2, credit_hours: 3, created_at: '2024-01-01T00:00:00.000Z' },
]

// ── Users ──────────────────────────────────────────────────────────────────────
const users = [
  {
    id: 1, name: 'System Admin', email: 'admin@cams.ac.ke',
    password_hash: ADMIN_HASH, role: 'admin',
    reg_number: null, course: null, department: 'Administration',
    is_active: true, status: 'active', created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2, name: 'Dr. James Mwangi', email: 'lecturer@cams.ac.ke',
    password_hash: LECTURER_HASH, role: 'lecturer',
    reg_number: null, course: null, department: 'Computer Science',
    school_id: 1, department_id: 1,
    is_active: true, status: 'active', created_at: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 3, name: 'Alice Wanjiku', email: 'alice@student.cams.ac.ke',
    password_hash: STUDENT_HASH, role: 'student',
    reg_number: 'SCT211-0001/2024', course: 'BSc Computer Science',
    school_id: 1, department_id: 1, course_id: 1, year_of_study: 2, semester: 1,
    is_active: true, status: 'active', created_at: '2024-01-03T00:00:00.000Z',
  },
  {
    id: 4, name: 'Brian Otieno', email: 'brian@student.cams.ac.ke',
    password_hash: STUDENT_HASH, role: 'student',
    reg_number: 'SCT211-0002/2024', course: 'BSc Computer Science',
    school_id: 1, department_id: 1, course_id: 1, year_of_study: 2, semester: 1,
    is_active: true, status: 'active', created_at: '2024-01-04T00:00:00.000Z',
  },
  {
    id: 5, name: 'Carol Muthoni', email: 'carol@student.cams.ac.ke',
    password_hash: STUDENT_HASH, role: 'student',
    reg_number: 'SCT211-0003/2024', course: 'BSc Information Technology',
    school_id: 1, department_id: 2, course_id: 2, year_of_study: 2, semester: 1,
    is_active: true, status: 'active', created_at: '2024-01-05T00:00:00.000Z',
  },
  {
    id: 6, name: 'Prof. Sarah Odhiambo', email: 'sarah@cams.ac.ke',
    password_hash: LECTURER_HASH, role: 'lecturer',
    reg_number: null, course: null, department: 'Mathematics',
    school_id: 4, department_id: 7,
    is_active: true, status: 'active', created_at: '2024-01-06T00:00:00.000Z',
  },
  {
    id: 9, name: 'Dr. Grace Njeri', email: 'hod@cams.ac.ke',
    password_hash: LECTURER_HASH, role: 'hod',
    reg_number: null, course: null, department: 'Computer Science',
    school_id: 1, department_id: 1,
    is_active: true, status: 'active', created_at: '2024-01-09T00:00:00.000Z',
  },
  {
    id: 7, name: 'David Kamau', email: 'david@student.cams.ac.ke',
    password_hash: STUDENT_HASH, role: 'student',
    reg_number: 'SCT211-0004/2024', course: 'BSc Computer Science',
    school_id: 1, department_id: 1, course_id: 1, year_of_study: 2, semester: 1,
    is_active: true, status: 'active', created_at: '2024-01-07T00:00:00.000Z',
  },
  {
    id: 8, name: 'Eve Njeri', email: 'eve@student.cams.ac.ke',
    password_hash: STUDENT_HASH, role: 'student',
    reg_number: 'SCT211-0005/2024', course: 'BSc Information Technology',
    school_id: 1, department_id: 2, course_id: 2, year_of_study: 2, semester: 1,
    is_active: true, status: 'active', created_at: '2024-01-08T00:00:00.000Z',
  },
]

// ── Enrollments ────────────────────────────────────────────────────────────────
const enrollments = [
  { id: 1,  student_id: 3, unit_id: 1 },
  { id: 2,  student_id: 3, unit_id: 2 },
  { id: 3,  student_id: 3, unit_id: 3 },
  { id: 4,  student_id: 4, unit_id: 1 },
  { id: 5,  student_id: 4, unit_id: 2 },
  { id: 6,  student_id: 5, unit_id: 6 },
  { id: 7,  student_id: 5, unit_id: 7 },
  { id: 8,  student_id: 7, unit_id: 1 },
  { id: 9,  student_id: 7, unit_id: 2 },
  { id: 10, student_id: 8, unit_id: 6 },
]

const lecturerAssignments = [
  { id: 1, lecturer_id: 2, unit_id: 1 },
  { id: 2, lecturer_id: 2, unit_id: 2 },
  { id: 3, lecturer_id: 2, unit_id: 3 },
  { id: 4, lecturer_id: 6, unit_id: 9 },
  { id: 5, lecturer_id: 6, unit_id: 10 },
]

const now = Date.now()
const sessions = [
  {
    id: 1, unit_id: 1, lecturer_id: 2, room: 'LH-3',
    started_at: new Date(now - 1800000).toISOString(),
    expires_at: new Date(now + 300000).toISOString(),
    duration_minutes: 60, qr_token: 'demo-active-token-001',
    qr_expiry_seconds: 300, is_active: true, ended_at: null,
  },
  {
    id: 2, unit_id: 2, lecturer_id: 2, room: 'Lab-2',
    started_at: new Date(now - 86400000).toISOString(),
    expires_at: new Date(now - 82800000).toISOString(),
    duration_minutes: 60, qr_token: 'demo-token-002',
    qr_expiry_seconds: 300, is_active: false,
    ended_at: new Date(now - 82800000).toISOString(),
  },
  {
    id: 3, unit_id: 1, lecturer_id: 2, room: 'LH-3',
    started_at: new Date(now - 172800000).toISOString(),
    expires_at: new Date(now - 169200000).toISOString(),
    duration_minutes: 60, qr_token: 'demo-token-003',
    qr_expiry_seconds: 300, is_active: false,
    ended_at: new Date(now - 169200000).toISOString(),
  },
  {
    id: 4, unit_id: 3, lecturer_id: 2, room: 'LH-1',
    started_at: new Date(now - 259200000).toISOString(),
    expires_at: new Date(now - 255600000).toISOString(),
    duration_minutes: 60, qr_token: 'demo-token-004',
    qr_expiry_seconds: 300, is_active: false,
    ended_at: new Date(now - 255600000).toISOString(),
  },
]

const attendance = [
  { id: 1, session_id: 1, student_id: 3, scanned_at: new Date(now - 1700000).toISOString(), status: 'present' },
  { id: 2, session_id: 1, student_id: 4, scanned_at: new Date(now - 1600000).toISOString(), status: 'present' },
  { id: 3, session_id: 2, student_id: 3, scanned_at: new Date(now - 86000000).toISOString(), status: 'present' },
  { id: 4, session_id: 2, student_id: 4, scanned_at: new Date(now - 85000000).toISOString(), status: 'late' },
  { id: 5, session_id: 3, student_id: 3, scanned_at: new Date(now - 172000000).toISOString(), status: 'present' },
  { id: 6, session_id: 3, student_id: 7, scanned_at: new Date(now - 171000000).toISOString(), status: 'present' },
  { id: 7, session_id: 4, student_id: 3, scanned_at: new Date(now - 258000000).toISOString(), status: 'present' },
]

const settings = {
  id: 1,
  university_name: 'Mount Kenya University — CAMS',
  qr_expiry_seconds: 300,
  email_notifications: true,
  low_attendance_threshold: 75,
  allow_late_marking: true,
  late_threshold_minutes: 15,
}

const nextId = {
  users: 9, schools: 10, departments: 18, courses: 10, units: 15,
  enrollments: 11, sessions: 5, attendance: 8,
}
function nextID(table) { return nextId[table]++ }

module.exports = {
  users, schools, departments, courses, units,
  enrollments, lecturerAssignments, sessions, attendance, settings, nextID,
}
