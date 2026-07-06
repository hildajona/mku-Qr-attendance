// node 25 has fetch global

async function run() {
  console.log('Testing Sheets API...');
  
  // Wait 2 seconds for server to fully initialize
  await new Promise(r => setTimeout(r, 2000));
  
  try {
    // Note: Since endpoints require authentication, we can test mock methods directly or test auth login first.
    // Let's test the sheetsService directly by calling its methods in node!
    const sheetsService = require('./services/sheets.service');
    
    console.log('1. Testing getSyncStatus...');
    const status = await sheetsService.getSyncStatus();
    console.log('   Sync Status Result:', JSON.stringify(status, null, 2));
    
    console.log('2. Testing connectSheet (Demo Mode)...');
    const connResult = await sheetsService.connectSheet('DEMO_SHEET_URL', true);
    console.log('   Connect Result:', JSON.stringify(connResult, null, 2));

    console.log('3. Testing previewSheet (Demo Mode)...');
    const preview = await sheetsService.previewSheet('DEMO_SHEET_URL', true);
    console.log(`   Preview Result: Found ${preview.students.length} students and ${preview.units.length} units.`);

    console.log('4. Testing syncSheet (Demo Mode)...');
    const syncRes = await sheetsService.syncSheet('DEMO_SHEET_URL', preview.students, preview.units, true);
    console.log('   Sync Result:', JSON.stringify(syncRes, null, 2));

    console.log('✅ All backend sheets service tests passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Tests failed:', err);
    process.exit(1);
  }
}

run();
