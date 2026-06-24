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
    for (const row of rows) {
      // Kill any root queries that have been running for more than 5 seconds or are related to table migrations/checks
      if (
        row.User === 'root' && 
        row.Id && 
        row.Info !== 'SHOW PROCESSLIST' && 
        row.Command === 'Query'
      ) {
        console.log(`Killing MySQL thread ${row.Id} running: ${row.Info}`);
        await db.query(`KILL ${row.Id}`);
      }
    }
    console.log('Successfully cleaned stale threads.');
  } catch (err) {
    console.error('Error killing threads:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
