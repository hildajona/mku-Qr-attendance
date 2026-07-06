const { pool, isAvailable } = require('../config/db')
const mock = require('../config/mockData')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const csv = require('csv-parser')
const stream = require('stream')

// Standard Demo Mode Sheet Data
const DEMO_STUDENTS = [
  { 'Registration Number': 'SCT211-0010/2024', 'Full Name': 'John Doe', 'Email': 'john.doe@student.cams.ac.ke', 'Phone Number': '0711223344', 'Course': 'BSc Computer Science', 'Department': 'Computer Science', 'Year of Study': '2', 'Class': 'CS-2A', 'Gender': 'Male' },
  { 'Registration Number': 'SCT211-0011/2024', 'Full Name': 'Mary Wambui', 'Email': 'mary.wambui@student.cams.ac.ke', 'Phone Number': '0722334455', 'Course': 'BSc Computer Science', 'Department': 'Computer Science', 'Year of Study': '2', 'Class': 'CS-2A', 'Gender': 'Female' },
  { 'Registration Number': 'SCT211-0012/2024', 'Full Name': 'David Ochieng', 'Email': 'david.ochieng@student.cams.ac.ke', 'Phone Number': '0733445566', 'Course': 'BSc Computer Science', 'Department': 'Computer Science', 'Year of Study': '2', 'Class': 'CS-2B', 'Gender': 'Male' },
  { 'Registration Number': 'SIT211-0020/2024', 'Full Name': 'Grace Mutua', 'Email': 'grace.mutua@student.cams.ac.ke', 'Phone Number': '0744556677', 'Course': 'BSc Information Technology', 'Department': 'Information Technology', 'Year of Study': '3', 'Class': 'IT-3A', 'Gender': 'Female' },
  { 'Registration Number': 'SIT211-0021/2024', 'Full Name': 'Alex Kiprop', 'Email': 'alex.kiprop@student.cams.ac.ke', 'Phone Number': '0755667788', 'Course': 'BSc Information Technology', 'Department': 'Information Technology', 'Year of Study': '3', 'Class': 'IT-3A', 'Gender': 'Male' },
  { 'Registration Number': 'SMA201-0030/2024', 'Full Name': 'Hassan Ali', 'Email': 'hassan.ali@student.cams.ac.ke', 'Phone Number': '0766778899', 'Course': 'Bachelor of Science in Mathematics', 'Department': 'Mathematics and Actuarial Science', 'Year of Study': '1', 'Class': 'MTH-1B', 'Gender': 'Male' },
  { 'Registration Number': 'SBA201-0040/2024', 'Full Name': 'Emily Chemutai', 'Email': 'emily.chemutai@student.cams.ac.ke', 'Phone Number': '0777889900', 'Course': 'Bachelor of Business Administration', 'Department': 'Business Administration', 'Year of Study': '2', 'Class': 'BUS-2A', 'Gender': 'Female' },
  { 'Registration Number': 'SNR201-0050/2024', 'Full Name': 'Joseph Kuria', 'Email': 'joseph.kuria@student.cams.ac.ke', 'Phone Number': '0788990011', 'Course': 'Bachelor of Science in Nursing', 'Department': 'Nursing Science', 'Year of Study': '4', 'Class': 'NUR-4A', 'Gender': 'Male' },
  { 'Registration Number': 'SNR201-0051/2024', 'Full Name': 'Sarah Mwende', 'Email': 'sarah.mwende@student.cams.ac.ke', 'Phone Number': '0799001122', 'Course': 'Bachelor of Science in Nursing', 'Department': 'Nursing Science', 'Year of Study': '4', 'Class': 'NUR-4A', 'Gender': 'Female' },
  { 'Registration Number': 'SCT211-0013/2024', 'Full Name': 'Peter Kamau', 'Email': 'peter.kamau@student.cams.ac.ke', 'Phone Number': '0700112233', 'Course': 'BSc Computer Science', 'Department': 'Computer Science', 'Year of Study': '2', 'Class': 'CS-2B', 'Gender': 'Male' }
]

const DEMO_UNITS = [
  { 'Unit Code': 'SCS 204', 'Unit Name': 'Artificial Intelligence', 'Lecturer': 'Dr. James Mwangi', 'Department': 'Computer Science', 'Semester': '1', 'Academic Year': '2024/2025' },
  { 'Unit Code': 'SCS 205', 'Unit Name': 'Human Computer Interaction', 'Lecturer': 'Dr. James Mwangi', 'Department': 'Computer Science', 'Semester': '1', 'Academic Year': '2024/2025' },
  { 'Unit Code': 'SIT 203', 'Unit Name': 'Web Application Development', 'Lecturer': 'Dr. James Mwangi', 'Department': 'Information Technology', 'Semester': '1', 'Academic Year': '2024/2025' },
  { 'Unit Code': 'SMA 203', 'Unit Name': 'Probability & Statistics II', 'Lecturer': 'Prof. Sarah Odhiambo', 'Department': 'Mathematics and Actuarial Science', 'Semester': '1', 'Academic Year': '2024/2025' },
  { 'Unit Code': 'SBA 203', 'Unit Name': 'Human Resource Management', 'Lecturer': 'Dr. Grace Njeri', 'Department': 'Business Administration', 'Semester': '1', 'Academic Year': '2024/2025' },
  { 'Unit Code': 'SNR 203', 'Unit Name': 'Medical-Surgical Nursing I', 'Lecturer': 'Dr. James Mwangi', 'Department': 'Nursing Science', 'Semester': '1', 'Academic Year': '2024/2025' }
]

// Database config holder
let settingsTableHealed = false

// Helper to query settings sync status
let mockSettingsSync = {
  google_sheets_url: '',
  last_sync_date: null,
  sync_status: 'Not Connected',
  total_students_imported: 0,
  total_units_imported: 0
}

/**
 * Ensure database settings table has sheets sync columns
 */
async function healDatabaseSchema() {
  if (settingsTableHealed || !isAvailable()) return
  const db = pool()
  const columns = [
    { name: 'google_sheets_url', type: 'VARCHAR(500) NULL' },
    { name: 'last_sync_date', type: 'DATETIME NULL' },
    { name: 'sync_status', type: 'VARCHAR(50) NULL' },
    { name: 'total_students_imported', type: 'INT DEFAULT 0' },
    { name: 'total_units_imported', type: 'INT DEFAULT 0' }
  ]
  for (const col of columns) {
    try {
      await db.query(`ALTER TABLE settings ADD COLUMN ${col.name} ${col.type}`)
    } catch (e) {
      // Column exists
    }
  }
  settingsTableHealed = true
}

/**
 * Extract Sheet ID from URL
 */
function extractSheetId(urlOrId) {
  if (!urlOrId) return null
  if (urlOrId.includes('docs.google.com/spreadsheets')) {
    const matches = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/)
    return matches ? matches[1] : null
  }
  return urlOrId // Assume raw ID
}

/**
 * Fetch and Parse CSV from Google Sheet URL
 */
async function fetchSheetCsv(sheetId, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch tab "${tabName}". Status: ${response.status}`)
  }
  const text = await response.text()
  return parseCsvText(text)
}

/**
 * Parse CSV raw text using csv-parser and streams
 */
function parseCsvText(text) {
  return new Promise((resolve, reject) => {
    const results = []
    const bufferStream = new stream.Readable()
    bufferStream._read = () => {}
    bufferStream.push(text)
    bufferStream.push(null)

    bufferStream.pipe(csv())
      .on('data', (data) => {
        // Clean headers and keys
        const cleaned = {}
        Object.keys(data).forEach(k => {
          const cleanKey = k.trim().replace(/^"|"$/g, '')
          cleaned[cleanKey] = data[k].trim().replace(/^"|"$/g, '')
        })
        results.push(cleaned)
      })
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err))
  })
}

/**
 * Normalize and map Student Rows
 */
function mapStudents(rows) {
  return rows.map((row, idx) => {
    const reg_number = row['Registration Number'] || row['registration_number'] || row['reg_number'] || row['Reg Number'] || '';
    const full_name = row['Full Name'] || row['full_name'] || row['Name'] || row['name'] || '';
    const email = row['Email'] || row['email'] || '';
    const phone = row['Phone Number'] || row['phone_number'] || row['Phone'] || row['phone'] || '';
    const course = row['Course'] || row['course'] || row['Programme'] || row['programme'] || '';
    const department = row['Department'] || row['department'] || row['Dept'] || row['dept'] || '';
    const year_of_study = parseInt(row['Year of Study'] || row['year_of_study'] || row['Year'] || row['year']) || 1;
    const className = row['Class'] || row['class'] || '';
    const gender = row['Gender'] || row['gender'] || 'Male';

    return {
      row_index: idx + 1,
      reg_number,
      full_name,
      email,
      phone,
      course,
      department,
      year_of_study,
      class: className,
      gender
    }
  }).filter(r => r.reg_number && r.full_name)
}

/**
 * Normalize and map Unit Rows
 */
function mapUnits(rows) {
  return rows.map((row, idx) => {
    const code = row['Unit Code'] || row['unit_code'] || row['Code'] || row['code'] || '';
    const name = row['Unit Name'] || row['unit_name'] || row['Name'] || row['name'] || '';
    const lecturer = row['Lecturer'] || row['lecturer'] || '';
    const department = row['Department'] || row['department'] || '';
    const semester = parseInt(row['Semester'] || row['semester']) || 1;
    const academic_year = row['Academic Year'] || row['academic_year'] || '2024/2025';

    return {
      row_index: idx + 1,
      code,
      name,
      lecturer,
      department,
      semester,
      academic_year
    }
  }).filter(r => r.code && r.name)
}

/**
 * Generate code abbreviation
 */
function generateCode(name) {
  if (!name) return 'GEN'
  return name
    .split(' ')
    .filter(w => w.length > 2)
    .map(w => w[0])
    .join('')
    .substring(0, 10)
    .toUpperCase()
}

module.exports = {
  // Retrieve Sync Stats & Settings
  getSyncStatus: async () => {
    await healDatabaseSchema()
    let totals = {
      total_students: 0,
      total_units: 0,
      total_sessions: 0,
      total_records: 0
    }

    if (isAvailable()) {
      const db = pool()
      try {
        const [[sSetting]] = await db.query('SELECT * FROM settings WHERE id=1')
        const [[{ total_students }]] = await db.query("SELECT COUNT(*) as total_students FROM users WHERE role='student'")
        const [[{ total_units }]] = await db.query("SELECT COUNT(*) as total_units FROM units")
        const [[{ total_sessions }]] = await db.query("SELECT COUNT(*) as total_sessions FROM sessions")
        const [[{ total_records }]] = await db.query("SELECT COUNT(*) as total_records FROM attendance")

        return {
          google_sheets_url: sSetting?.google_sheets_url || '',
          last_sync_date: sSetting?.last_sync_date || null,
          sync_status: sSetting?.sync_status || 'Not Connected',
          total_students_imported: sSetting?.total_students_imported || 0,
          total_units_imported: sSetting?.total_units_imported || 0,
          total_students,
          total_units,
          total_sessions,
          total_records
        }
      } catch (err) {
        console.error('Error fetching sheets config from database:', err.message)
      }
    }

    // Demo Mode fallback
    return {
      google_sheets_url: mockSettingsSync.google_sheets_url,
      last_sync_date: mockSettingsSync.last_sync_date,
      sync_status: mockSettingsSync.sync_status,
      total_students_imported: mockSettingsSync.total_students_imported,
      total_units_imported: mockSettingsSync.total_units_imported,
      total_students: mock.users.filter(u => u.role === 'student').length,
      total_units: mock.units.length,
      total_sessions: mock.sessions.length,
      total_records: mock.attendance.length
    }
  },

  // Connect and validate Sheet URL/ID
  connectSheet: async (urlOrId, forceDemo = false) => {
    await healDatabaseSchema()
    const sheetId = extractSheetId(urlOrId)
    if (!sheetId && !forceDemo) {
      throw new Error('Invalid Google Sheet URL or ID')
    }

    let status = 'Connected'
    if (forceDemo) {
      if (isAvailable()) {
        const db = pool()
        await db.query(`UPDATE settings SET google_sheets_url=?, sync_status=? WHERE id=1`, ['DEMO_SHEET_URL', 'Demo Connected'])
      }
      mockSettingsSync.google_sheets_url = 'DEMO_SHEET_URL'
      mockSettingsSync.sync_status = 'Demo Connected'
      return { success: true, sheetId: 'demo', message: 'Demo Mode Activated successfully' }
    }

    try {
      // Validate by fetching the sheets headers
      await fetchSheetCsv(sheetId, 'Students')
      await fetchSheetCsv(sheetId, 'Units')

      // Save connection
      if (isAvailable()) {
        const db = pool()
        await db.query(`UPDATE settings SET google_sheets_url=?, sync_status=? WHERE id=1`, [urlOrId, 'Connected'])
      }
      mockSettingsSync.google_sheets_url = urlOrId
      mockSettingsSync.sync_status = 'Connected'

      return { success: true, sheetId, message: 'Google Sheet connected and validated successfully!' }
    } catch (e) {
      throw new Error(`Sheet validation failed. Please ensure the Google Sheet is shared as "Anyone with link can view" and contains tabs named "Students" and "Units". Detail: ${e.message}`)
    }
  },

  // Preview sheets data
  previewSheet: async (urlOrId, forceDemo = false) => {
    if (forceDemo || urlOrId === 'DEMO_SHEET_URL') {
      return {
        students: mapStudents(DEMO_STUDENTS),
        units: mapUnits(DEMO_UNITS)
      }
    }

    const sheetId = extractSheetId(urlOrId)
    if (!sheetId) throw new Error('Invalid Sheet URL or ID')

    try {
      const studentRows = await fetchSheetCsv(sheetId, 'Students')
      const unitRows = await fetchSheetCsv(sheetId, 'Units')

      return {
        students: mapStudents(studentRows),
        units: mapUnits(unitRows)
      }
    } catch (e) {
      throw new Error(`Failed to fetch preview: ${e.message}`)
    }
  },

  // Perform full Synchronization
  syncSheet: async (urlOrId, students, units, forceDemo = false) => {
    await healDatabaseSchema()
    const isDemo = forceDemo || urlOrId === 'DEMO_SHEET_URL' || !isAvailable()
    const syncTime = new Date()

    let importedStudents = 0
    let importedUnits = 0

    if (!isDemo) {
      const db = pool()
      await db.query('START TRANSACTION')
      try {
        const defaultHash = await bcrypt.hash('student123', 10)
        const lecturerHash = await bcrypt.hash('lecturer123', 10)

        // 1. IMPORT STUDENTS
        for (const stud of students) {
          // Check duplicates by registration number
          const [dup] = await db.query('SELECT id FROM users WHERE reg_number = ?', [stud.reg_number])
          let userId
          
          if (dup.length > 0) {
            userId = dup[0].id
            // Update existing user details
            await db.query(
              `UPDATE users SET full_name = ?, email = ?, phone = ?, course = ?, department = ? WHERE id = ?`,
              [stud.full_name, stud.email || null, stud.phone || null, stud.course || null, stud.department || null, userId]
            )
            // Update student details
            await db.query(
              `UPDATE students SET year_of_study = ?, department = ?, programme = ? WHERE user_id = ?`,
              [stud.year_of_study, stud.department || null, stud.course || null, userId]
            )
          } else {
            // Insert new user
            userId = crypto.randomUUID()
            await db.query(
              `INSERT INTO users (id, full_name, email, phone, password_hash, role, reg_number, course, department, status, has_smartphone) 
               VALUES (?, ?, ?, ?, ?, 'student', ?, ?, ?, 'active', 1)`,
              [userId, stud.full_name, stud.email || null, stud.phone || null, defaultHash, stud.reg_number, stud.course || null, stud.department || null]
            )
            // Insert student record
            await db.query(
              `INSERT INTO students (user_id, admission_number, student_reg_no, department, programme, year_of_study, semester) 
               VALUES (?, ?, ?, ?, ?, ?, 1)`,
              [userId, stud.reg_number, stud.reg_number, stud.department || null, stud.course || null, stud.year_of_study]
            )
            importedStudents++
          }
        }

        // 2. IMPORT UNITS & LECTURERS
        for (const ut of units) {
          // Ensure Department exists
          let deptId = null
          if (ut.department) {
            const [deptRows] = await db.query('SELECT id FROM departments WHERE name = ? OR code = ?', [ut.department, ut.department])
            if (deptRows.length > 0) {
              deptId = deptRows[0].id
            } else {
              const code = generateCode(ut.department)
              const [res] = await db.query('INSERT INTO departments (name, code) VALUES (?, ?)', [ut.department, code])
              deptId = res.insertId
            }
          }

          // Ensure Course exists in department
          let courseId = null
          const tempCourseName = ut.department ? `${ut.department} Course` : 'General Course'
          const tempCourseCode = ut.department ? `${generateCode(ut.department)}-GEN` : 'GEN-CRS'

          const [courseRows] = await db.query('SELECT id FROM courses WHERE name = ? OR code = ?', [tempCourseName, tempCourseCode])
          if (courseRows.length > 0) {
            courseId = courseRows[0].id
          } else {
            const [res] = await db.query('INSERT INTO courses (name, code, department_id) VALUES (?, ?, ?)', [tempCourseName, tempCourseCode, deptId])
            courseId = res.insertId
          }

          // Ensure Lecturer exists
          let lecturerId = null
          if (ut.lecturer) {
            const [lecRows] = await db.query('SELECT id FROM users WHERE full_name = ? AND role = ?', [ut.lecturer, 'lecturer'])
            if (lecRows.length > 0) {
              lecturerId = lecRows[0].id
            } else {
              lecturerId = crypto.randomUUID()
              const email = `${ut.lecturer.toLowerCase().replace(/[^a-z]/g, '')}@cams.ac.ke`
              // Insert lecturer
              await db.query(
                `INSERT INTO users (id, full_name, email, password_hash, role, department, status) 
                 VALUES (?, ?, ?, ?, 'lecturer', ?, 'active')`,
                [lecturerId, ut.lecturer, email, lecturerHash, ut.department || null]
              )
              // Create lecturer assignments profile
              await db.query(
                `INSERT IGNORE INTO lecturers (user_id, employee_number, department_id, is_active) 
                 VALUES (?, ?, ?, 1)`,
                [lecturerId, `EMP-${generateCode(ut.lecturer)}-${Math.floor(Math.random() * 900 + 100)}`, deptId]
              )
            }
          }

          // Create or Update Unit
          const [unitDup] = await db.query('SELECT id FROM units WHERE code = ?', [ut.code])
          let unitId
          if (unitDup.length > 0) {
            unitId = unitDup[0].id
            await db.query(
              `UPDATE units SET name = ?, course_id = ?, department_id = ?, semester = ?, academic_year = ? WHERE id = ?`,
              [ut.name, courseId, deptId, ut.semester, ut.academic_year, unitId]
            )
          } else {
            const [res] = await db.query(
              `INSERT INTO units (course_id, department_id, name, code, semester, academic_year, credit_hours) 
               VALUES (?, ?, ?, ?, ?, ?, 3)`,
              [courseId, deptId, ut.name, ut.code, ut.semester, ut.academic_year]
            )
            unitId = res.insertId
            importedUnits++
          }

          // Link Lecturer to Unit
          if (lecturerId && unitId) {
            await db.query(
              `INSERT IGNORE INTO lecturer_assignments (lecturer_id, unit_id) VALUES (?, ?)`,
              [lecturerId, unitId]
            )
          }
        }

        // 3. ENROLL STUDENTS IN UNITS
        // Relate students to units matching their course name / department
        await db.query(`
          INSERT IGNORE INTO enrollments (student_id, unit_id)
          SELECT s.user_id, u.id 
          FROM students s
          JOIN units u ON u.department_id = (
            SELECT id FROM departments WHERE name = s.department LIMIT 1
          )
        `)

        // 4. UPDATE STATUS SETTINGS
        await db.query(
          `UPDATE settings SET last_sync_date = ?, sync_status = 'Synced', 
           total_students_imported = total_students_imported + ?, 
           total_units_imported = total_units_imported + ? WHERE id = 1`,
          [syncTime, importedStudents, importedUnits]
        )

        await db.query('COMMIT')
      } catch (err) {
        await db.query('ROLLBACK')
        throw new Error(`Database transaction failed: ${err.message}`)
      }
    } else {
      // IN-MEMORY SYNC FOR DEMO MODE
      const defaultHash = await bcrypt.hash('student123', 10)
      const lecturerHash = await bcrypt.hash('lecturer123', 10)

      // Sync students in mockData
      for (const stud of students) {
        const exists = mock.users.find(u => u.reg_number === stud.reg_number)
        if (exists) {
          exists.name = stud.full_name
          exists.email = stud.email
          exists.phone = stud.phone
          exists.course = stud.course
          exists.department = stud.department
        } else {
          const id = mock.nextID('users')
          mock.users.push({
            id,
            name: stud.full_name,
            email: stud.email,
            phone: stud.phone,
            password_hash: defaultHash,
            role: 'student',
            reg_number: stud.reg_number,
            course: stud.course,
            department: stud.department,
            is_active: true,
            created_at: syncTime.toISOString()
          })
          importedStudents++
        }
      }

      // Sync units & lecturers in mockData
      for (const ut of units) {
        // Ensure department
        let dept = mock.departments.find(d => d.name === ut.department)
        if (!dept) {
          const id = mock.nextID('departments')
          dept = { id, name: ut.department, code: generateCode(ut.department), created_at: syncTime.toISOString() }
          mock.departments.push(dept)
        }

        // Ensure course
        const tempCourseName = ut.department ? `${ut.department} Course` : 'General Course'
        let course = mock.courses.find(c => c.name === tempCourseName)
        if (!course) {
          const id = mock.nextID('courses')
          course = { id, name: tempCourseName, code: `${dept.code}-GEN`, department_id: dept.id, created_at: syncTime.toISOString() }
          mock.courses.push(course)
        }

        // Ensure lecturer
        let lecturer = mock.users.find(u => u.name === ut.lecturer && u.role === 'lecturer')
        if (!lecturer) {
          const id = mock.nextID('users')
          lecturer = {
            id,
            name: ut.lecturer,
            email: `${ut.lecturer.toLowerCase().replace(/[^a-z]/g, '')}@cams.ac.ke`,
            password_hash: lecturerHash,
            role: 'lecturer',
            department: ut.department,
            is_active: true,
            created_at: syncTime.toISOString()
          }
          mock.users.push(lecturer)
        }

        // Ensure unit
        let unit = mock.units.find(u => u.code === ut.code)
        if (unit) {
          unit.name = ut.name
          unit.semester = ut.semester
          unit.academic_year = ut.academic_year
        } else {
          const id = mock.nextID('units')
          unit = {
            id,
            course_id: course.id,
            department_id: dept.id,
            name: ut.name,
            code: ut.code,
            semester: ut.semester,
            academic_year: ut.academic_year,
            credit_hours: 3,
            created_at: syncTime.toISOString()
          }
          mock.units.push(unit)
          importedUnits++
        }

        // Lecturer Assignment
        const assigned = mock.lecturerAssignments.find(la => la.lecturer_id === lecturer.id && la.unit_id === unit.id)
        if (!assigned) {
          mock.lecturerAssignments.push({
            id: mock.nextID('lecturerAssignments') || (mock.lecturerAssignments.length + 1),
            lecturer_id: lecturer.id,
            unit_id: unit.id
          })
        }
      }

      // Auto enroll students in units of same department
      for (const studUser of mock.users.filter(u => u.role === 'student')) {
        const studentUnits = mock.units.filter(u => {
          const dept = mock.departments.find(d => d.id === u.department_id)
          return dept && dept.name === studUser.department
        })

        for (const su of studentUnits) {
          const enrolled = mock.enrollments.find(e => e.student_id === studUser.id && e.unit_id === su.id)
          if (!enrolled) {
            mock.enrollments.push({
              id: mock.enrollments.length + 1,
              student_id: studUser.id,
              unit_id: su.id
            })
          }
        }
      }

      // Save sync settings
      mockSettingsSync.last_sync_date = syncTime.toISOString()
      mockSettingsSync.sync_status = 'Synced'
      mockSettingsSync.total_students_imported += importedStudents
      mockSettingsSync.total_units_imported += importedUnits
    }

    return {
      success: true,
      importedStudents,
      importedUnits,
      last_sync_date: syncTime,
      sync_status: 'Synced'
    }
  }
}
