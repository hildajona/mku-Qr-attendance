const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host:               process.env.DB_HOST     || 'localhost',
    port:               parseInt(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    database:           process.env.DB_NAME     || 'mku_attendance',
    multipleStatements: true
  });

  const sqlPath = path.join(__dirname, 'migrate_fix_columns.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await connection.query(sql);
    console.log('Successfully applied missing columns migrations.');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await connection.end();
  }
}

run();
