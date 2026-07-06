const mysql = require('mysql2/promise');
require('dotenv').config();

async function test(port) {
  try {
    const config = {
      host:               process.env.DB_HOST     || '127.0.0.1',
      port:               port,
      user:               process.env.DB_USER     || 'root',
      password:           process.env.DB_PASSWORD || '',
      database:           process.env.DB_NAME     || 'cams_attendance',
      connectTimeout:     3000,
    };
    console.log(`Trying port ${port}...`);
    const conn = await mysql.createConnection(config);
    console.log(`✅ Success on port ${port}!`);
    await conn.end();
  } catch (err) {
    console.error(`❌ Failed on port ${port}:`, err.message);
  }
}

async function run() {
  await test(330);
  await test(3306);
}

run();
