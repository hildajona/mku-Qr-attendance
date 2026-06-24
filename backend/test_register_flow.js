const BASE = 'http://localhost:5000/api';

async function run() {
  const rand = Math.floor(Math.random() * 10000000);
  const regPayload = {
    full_name: 'Test Student',
    student_reg_no: `SCT-TEST-${rand}`,
    phone: `07${String(rand).padStart(8, '0')}`,
    email: `teststudent_${rand}@student.mku.ac.ke`,
    department: 'Computing',
    programme: 'BSc Computer Science',
    password: 'Student123!',
    has_smartphone: true
  };

  const regRes = await fetch(`${BASE}/auth/register/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload)
  });

  const regData = await regRes.json();
  console.log('Register response:', regRes.status, regData);

  if (regRes.status !== 201) {
    console.error('Registration failed');
    process.exit(1);
  }

  // Login as admin to get pending registrations
  console.log('\n2. Logging in as Admin...');
  const adminLoginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@mku.ac.ke', password: 'admin123' })
  });
  const adminData = await adminLoginRes.json();
  const token = adminData.token;
  console.log('Admin login status:', adminLoginRes.status);

  // Fetch pending registrations
  console.log('\n3. Fetching pending registrations...');
  const pendingRes = await fetch(`${BASE}/admin/registrations?status=pending`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const pendingData = await pendingRes.json();
  console.log('Pending registrations count:', pendingData.registrations.length);
  
  const createdStudent = pendingData.registrations.find(r => r.phone === regPayload.phone);
  if (!createdStudent) {
    console.error('Created student not found in pending list!');
    process.exit(1);
  }
  console.log('Found registered student with ID:', createdStudent.id);

  // Approve student
  console.log('\n4. Approving student...');
  const approveRes = await fetch(`${BASE}/admin/registrations/${createdStudent.id}/approve`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({})
  });
  const approveData = await approveRes.json();
  console.log('Approve status:', approveRes.status, approveData);

  // Try logging in as the newly approved student
  console.log('\n5. Logging in as newly approved student...');
  const studentLoginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: regPayload.email, password: 'Student123!' })
  });
  const studentData = await studentLoginRes.json();
  console.log('Student login status:', studentLoginRes.status, studentData);

  process.exit(0);
}

run().catch(console.error);
