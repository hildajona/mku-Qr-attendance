const mysql = require('mysql2/promise')
require('dotenv').config()

let pool = null
let dbAvailable = false

async function createPool() {
  try {
    pool = mysql.createPool({
      host:               process.env.DB_HOST     || 'localhost',
      port:               parseInt(process.env.DB_PORT) || 3306,
      user:               process.env.DB_USER     || 'root',
      password:           process.env.DB_PASSWORD || '',
      database:           process.env.DB_NAME     || 'mku_attendance',
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
      timezone:           '+00:00',
      connectTimeout:     3000,
    })
    const conn = await pool.getConnection()
    conn.release()
    dbAvailable = true
    console.log('✅ MySQL connected successfully')
  } catch (err) {
    dbAvailable = false
    pool = null
    console.log('⚠️  MySQL not available — running in DEMO mode (in-memory data)')
  }
}

createPool()

function isAvailable() { return dbAvailable }

module.exports = { pool: () => pool, isAvailable }
