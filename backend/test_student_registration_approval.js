// Test Suite: Student Registration to Admin Approval & Rejection Flow
require('dotenv').config()
const { pool } = require('./config/db')
const bcrypt = require('bcryptjs')

const BASE_URL = 'http://localhost:5002'
process.env.PORT = '5002'

console.log('Starting MKU server on port 5002 for integration testing...')
require('./server')

// Wait for database and server to spin up
setTimeout(async () => {
  console.log('\n--- STARTING REGISTRATION & APPROVAL SYSTEM TESTS ---')
  let passed = 0
  let failed = 0

  async function assert(name, condition) {
    if (condition) {
      console.log(`✅ PASSED: ${name}`)
      passed++
    } else {
      console.error(`❌ FAILED: ${name}`)
      failed++
    }
  }

  try {
    // 1. Register a student
    const regPayload = {
      full_name: 'Test Pending Student',
      student_reg_no: 'SCT221-TEST-1234/2026',
      phone: '0700112233',
      email: 'test_student@mku.ac.ke',
      department: 'Computing',
      programme: 'BSc Computer Science',
      year_of_study: '2',
      semester: '1',
      has_smartphone: 'true',
      courses: [1, 2], // select unit IDs
      password: 'Password123'
    }

    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload)
    })

    const regData = await registerRes.json()
    await assert('Student registration yields 201 Created and success confirmation', registerRes.status === 201)
    await assert('Registration returns success message', regData.message && regData.message.includes('submitted'))

    // 2. Try logging in as the pending student
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: '0700112233', password: 'Password123' })
    })

    const loginData = await loginRes.json()
    await assert('Login for pending student returns 403 Forbidden', loginRes.status === 403)
    await assert(
      'Login response includes exact pending approval notification and admin phone info',
      loginData.message && loginData.message.includes('Your account is still pending approval') && loginData.message.includes('Call:')
    )
    console.log('Login error message shown to user:', loginData.message)

    // Let's log in as admin to manage the pending user
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@mku.ac.ke', password: 'admin123' })
    })
    const adminLoginData = await adminLoginRes.json()
    const adminToken = adminLoginData.token
    await assert('Admin login succeeded', !!adminToken)

    // 3. List registrations
    const getRegsRes = await fetch(`${BASE_URL}/api/admin/registrations?status=pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    const getRegsData = await getRegsRes.json()
    const registrations = getRegsData.registrations || []
    const targetReg = registrations.find(r => r.reg_number === 'SCT221-TEST-1234/2026')
    await assert('Pending registration found in list', !!targetReg)

    if (targetReg) {
      // 4. View details
      const detailRes = await fetch(`${BASE_URL}/api/admin/registrations/${targetReg.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      const detailData = await detailRes.json()
      await assert('Get details returns student data', detailData.registration && detailData.registration.name === 'Test Pending Student')

      // 5. Approve student registration with edits
      const approveRes = await fetch(`${BASE_URL}/api/admin/registrations/${targetReg.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          phone: '0700112244', // corrected phone
          year_of_study: 3,
          semester: 2,
          courses: [2, 3]
        })
      })
      await assert('Registration approval returns 200 OK', approveRes.status === 200)

      // Verify student login works now with corrected phone number
      const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: '0700112244', password: 'Password123' })
      })
      const studentLoginData = await studentLoginRes.json()
      await assert('Approved student login succeeded with corrected phone', studentLoginRes.status === 200 && !!studentLoginData.token)

      // Clean up test users from DB if database is connected
      try {
        const db = pool()
        await db.query('DELETE FROM enrollments WHERE student_id = ?', [targetReg.id])
        await db.query('DELETE FROM students WHERE user_id = ?', [targetReg.id])
        await db.query('DELETE FROM users WHERE id = ?', [targetReg.id])
        console.log('Test records cleaned up.')
      } catch {}
    }

  } catch (err) {
    console.error('Test error:', err)
    failed++
  }

  console.log('\n--- REGISTRATION FLOW TESTS SUMMARY ---')
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)

  process.exit(failed > 0 ? 1 : 0)
}, 1500)
