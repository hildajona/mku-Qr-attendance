const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host:               process.env.DB_HOST     || 'localhost',
    port:               parseInt(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    database:           process.env.DB_NAME     || 'mku_attendance',
  });

  const [users] = await connection.query('SELECT id, full_name, email, reg_number, role, is_active FROM users');
  console.log('Users in DB:');
  console.table(users);

  await connection.end();
}

run().catch(console.error);
