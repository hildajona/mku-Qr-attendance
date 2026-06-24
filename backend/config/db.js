const mysql = require('mysql2/promise')
require('dotenv').config()

let _pool = null
let _available = false

// Try to connect — never crash the process on failure
async function init() {
  try {
    const pool = mysql.createPool({
      host:               process.env.DB_HOST     || 'localhost',
      port:               parseInt(process.env.DB_PORT) || 3306,
      user:               process.env.DB_USER     || 'root',
      password:           process.env.DB_PASSWORD || '',
      database:           process.env.DB_NAME     || 'cams_attendance',
      waitForConnections: true,
      connectionLimit:    10,
      connectTimeout:     3000,
      timezone:           '+00:00',
    })
    // Test the connection
    const conn = await pool.getConnection()
    conn.release()
    _pool = pool
    _available = true
    console.log('✅  MySQL connected — using live database')
  } catch {
    _pool = null
    _available = false
    console.log('⚠️   MySQL unavailable — running in DEMO mode (in-memory data)')
  }
}

init()

module.exports = {
  pool:        () => _pool,
  isAvailable: () => _available,
}
