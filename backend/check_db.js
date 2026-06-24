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

  const [users] = await connection.query('SHOW CREATE TABLE users');
  console.log(users[0]['Create Table']);
  const [courses] = await connection.query('SHOW CREATE TABLE courses');
  console.log(courses[0]['Create Table']);

  await connection.end();
}

run().catch(console.error);
