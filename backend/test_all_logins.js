require('dotenv').config()

const BASE = 'http://localhost:5000/api'

async function testLogin(label, identifier, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  })
  const data = await res.json()
  if (res.status === 200 && data.token) {
    console.log(`✅ ${label} (${identifier}) — Login OK | role: ${data.user?.role}`)
    return data.token
  } else {
    console.error(`❌ ${label} (${identifier}) — FAILED [${res.status}]: ${data.message}`)
    return null
  }
}

async function testProtected(label, token, path, expectedStatus = 200) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const status = res.status
  if (status === expectedStatus) {
    console.log(`  ✅ ${label} → GET ${path} [${status}]`)
  } else {
    const body = await res.text()
    console.error(`  ❌ ${label} → GET ${path} [${status}] — ${body.slice(0, 120)}`)
  }
}

async function run() {
  console.log('\n===== LOGIN TESTS =====')
  const adminToken    = await testLogin('Admin',    'admin@mku.ac.ke',    'admin123')
  const lecturerToken = await testLogin('Lecturer', 'lecturer@mku.ac.ke', 'lecturer123')
  const studentToken  = await testLogin('Student',  'brian@student.mku.ac.ke', 'student123')

  console.log('\n===== PROTECTED ROUTE TESTS =====')
  if (adminToken) {
    await testProtected('Admin', adminToken, '/admin/pending-registrations')
    await testProtected('Admin', adminToken, '/venues')
  }
  if (lecturerToken) {
    await testProtected('Lecturer', lecturerToken, '/sessions/lecturer')
    await testProtected('Lecturer', lecturerToken, '/appeals/lecturer')
  }
  if (studentToken) {
    await testProtected('Student', studentToken, '/appeals/student')
    await testProtected('Student', studentToken, '/sessions/active')
  }

  console.log('\n===== DONE =====\n')
}

run().catch(console.error)
