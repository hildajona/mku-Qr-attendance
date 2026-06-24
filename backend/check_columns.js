const { pool, isAvailable } = require('./config/db');

async function run() {
  console.log('Waiting for pool...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  if (!isAvailable()) {
    console.error('DB not available');
    process.exit(1);
  }
  const db = pool();
  try {
    const [rows] = await db.query('SHOW PROCESSLIST');
    console.log('MySQL process list:');
    console.log(rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
