const { pool, isAvailable } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('Waiting for DB connection pool to initialize...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (!isAvailable()) {
    console.error('MySQL is not available! Make sure the MySQL server is running.');
    process.exit(1);
  }

  const db = pool();

  const fixSql = fs.readFileSync(path.join(__dirname, 'migrate_fix_columns.sql'), 'utf8');
  const smartSql = fs.readFileSync(path.join(__dirname, 'migrate_no_smartphone.sql'), 'utf8');

  try {
    // Split statements by semicolon to avoid syntax errors if multipleStatements is not supported per query execution
    const runStatements = async (sqlText) => {
      const statements = sqlText
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      for (const statement of statements) {
        await db.query(statement);
      }
    };

    console.log('Running migrate_fix_columns.sql...');
    await runStatements(fixSql);
    console.log('Successfully ran migrate_fix_columns.sql');

    console.log('Running migrate_no_smartphone.sql...');
    await runStatements(smartSql);
    console.log('Successfully ran migrate_no_smartphone.sql');

    console.log('Migrations finished successfully.');
  } catch (err) {
    console.error('Error running migrations:', err);
  } finally {
    process.exit(0);
  }
}

run();
