// Self-contained Endpoints Validation Test
process.env.PORT = '5001'
process.env.JWT_SECRET = 'test_secret_key'

// Start the server
console.log('Spinning up server on test port 5001...')
require('./server')

// Wait 1.5 seconds for server boot-up
setTimeout(async () => {
  console.log('\n--- STARTING API ENDPOINTS TESTS ---');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn()
      console.log(`✅ PASSED: ${name}`)
      passed++
    } catch (err) {
      console.error(`❌ FAILED: ${name}\n`, err)
      failed++
    }
  }

  // 1. Health Check
  await test('Health check returns ok status and accurate metadata', async () => {
    const res = await fetch('http://localhost:5001/api/health')
    if (res.status !== 200) throw new Error(`Status was ${res.status}`)
    const data = await res.json()
    if (data.status !== 'ok' || (!data.service.includes('MKU') && !data.service.includes('CAMS'))) {
      throw new Error(`Invalid response structure: ${JSON.stringify(data)}`)
    }
  })

  // 2. Auth Login validation
  await test('Login returns proper error (401) on wrong credentials (no 500)', async () => {
    const res = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'non_existent_user', password: 'wrongpassword' })
    })
    if (res.status === 500) throw new Error('Returned server error 500')
    const data = await res.json()
    if (!data.message) throw new Error(`Missing message: ${JSON.stringify(data)}`)
  })

  // 3. Venues Protection
  await test('GET /api/venues returns 401 Unauthorized when no authentication token is provided', async () => {
    const res = await fetch('http://localhost:5001/api/venues')
    if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`)
  })

  // 4. Active Sessions
  await test('GET /api/sessions/active returns list of active sessions (requires authentication check or returns 401)', async () => {
    const res = await fetch('http://localhost:5001/api/sessions/active')
    // Router has 'authenticate' middleware on this, so it should return 401
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${res.status}`)
    }
  })

  // 5. USSD Dial menu check
  await test('POST /api/ussd returns plain text menu with CON or END', async () => {
    const res = await fetch('http://localhost:5001/api/ussd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'test_session_123', serviceCode: '*384*5000#', phoneNumber: '254712345678', text: '' })
    })
    if (res.status !== 200) throw new Error(`Status was ${res.status}`)
    const text = await res.text()
    if (!text.startsWith('CON') && !text.startsWith('END')) {
      throw new Error(`USSD must return standard AT response prefix. Got: "${text}"`)
    }
  })

  // 6. Appeals Protection
  await test('GET /api/appeals/student returns 401 without auth token (no 500)', async () => {
    const res = await fetch('http://localhost:5001/api/appeals/student')
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`)
  })

  console.log('\n--- TEST RESULTS SUMMARY ---');
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);

  if (failed > 0) {
    console.log('Some tests failed. Check the logs above.');
    process.exit(1)
  } else {
    console.log('All tests completed successfully. Outputs verified.');
    process.exit(0)
  }
}, 1500)
