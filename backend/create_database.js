const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const cleanSql = (sqlText) => {
  let cleaned = sqlText.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.split('\n')
    .map(line => {
      const idx1 = line.indexOf('--');
      const idx2 = line.indexOf('#');
      let idx = -1;
      if (idx1 !== -1 && idx2 !== -1) idx = Math.min(idx1, idx2);
      else if (idx1 !== -1) idx = idx1;
      else if (idx2 !== -1) idx = idx2;
      
      if (idx !== -1) return line.substring(0, idx);
      return line;
    })
    .join('\n');
  return cleaned;
};

async function run() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT) || 330;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'root';

  console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);
  
  let connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });
  
  await connection.query('CREATE DATABASE IF NOT EXISTS mku_attendance;');
  console.log('✅ Database mku_attendance verified.');
  await connection.end();

  connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database: 'mku_attendance',
    multipleStatements: true
  });

  const runSqlFile = async (filename) => {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) return;
    console.log(`Running ${filename}...`);
    const sqlText = fs.readFileSync(filePath, 'utf8');
    const cleanedText = cleanSql(sqlText);
    const statements = cleanedText.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const statement of statements) {
      if (statement.toLowerCase().includes('if not exists') && 
          (statement.toLowerCase().includes('alter table') || statement.toLowerCase().includes('create index'))) {
        continue;
      }
      try {
        await connection.query(statement);
      } catch (err) {
        console.warn(`Statement warning/error in ${filename}: ${err.message}`);
      }
    }
    console.log(`✅ Finished running ${filename}`);
  };

  await runSqlFile('config/schema.sql');
  await runSqlFile('migrate_phase1_4.sql');

  // Create students table
  console.log('Ensuring students table exists...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS students (
      user_id INT PRIMARY KEY,
      student_reg_no VARCHAR(100) NOT NULL UNIQUE,
      department VARCHAR(255),
      programme VARCHAR(255),
      year_of_study INT,
      semester INT,
      device_fingerprint VARCHAR(255),
      face_encoding TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create lecturers table
  console.log('Ensuring lecturers table exists...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS lecturers (
      user_id INT PRIMARY KEY,
      staff_id VARCHAR(100) NOT NULL UNIQUE,
      department VARCHAR(255),
      title VARCHAR(255),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Align table `users` columns: name -> full_name, and add status
  const [cols] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'mku_attendance' AND TABLE_NAME = 'users'`
  );
  const columnNames = cols.map(c => c.COLUMN_NAME.toLowerCase());

  if (columnNames.includes('name') && !columnNames.includes('full_name')) {
    console.log('Renaming name -> full_name in users...');
    await connection.query('ALTER TABLE users CHANGE COLUMN name full_name VARCHAR(255) NOT NULL');
  } else if (!columnNames.includes('full_name')) {
    console.log('Adding full_name column to users...');
    await connection.query('ALTER TABLE users ADD COLUMN full_name VARCHAR(255) NOT NULL');
  }

  if (!columnNames.includes('status')) {
    console.log('Adding status column to users...');
    await connection.query("ALTER TABLE users ADD COLUMN status ENUM('pending','active','inactive') DEFAULT 'active'");
  }

  const addColumnIfNeeded = async (tableName, columnName, definition) => {
    const [rows] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = 'mku_attendance' AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [tableName, columnName]
    );
    if (rows.length === 0) {
      console.log(`Adding column ${columnName} to table ${tableName}...`);
      await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    }
  };

  const addIndexIfNeeded = async (tableName, indexName, columnsStr) => {
    const [rows] = await connection.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = 'mku_attendance' AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [tableName, indexName]
    );
    if (rows.length === 0) {
      console.log(`Creating index ${indexName} on ${tableName}(${columnsStr})...`);
      await connection.query(`CREATE INDEX ${indexName} ON ${tableName}(${columnsStr})`);
    }
  };

  // Add the remaining columns
  await addColumnIfNeeded('users', 'phone', "VARCHAR(20) UNIQUE");
  await addColumnIfNeeded('users', 'failed_attempts', "INT DEFAULT 0");
  await addColumnIfNeeded('users', 'locked_until', "TIMESTAMP NULL");
  await addColumnIfNeeded('users', 'has_smartphone', "TINYINT(1) NOT NULL DEFAULT 1");
  await addColumnIfNeeded('users', 'preferred_attendance_method', "ENUM('qr','ussd','sms','computer','manual') DEFAULT 'qr'");

  // Columns for `sessions`
  await addColumnIfNeeded('sessions', 'rotating_code', "VARCHAR(10)");
  await addColumnIfNeeded('sessions', 'rotating_code_expires', "TIMESTAMP NULL DEFAULT NULL");
  await addColumnIfNeeded('sessions', 'classroom_name', "VARCHAR(255) NULL");
  await addColumnIfNeeded('sessions', 'latitude', "DECIMAL(10,7) NULL");
  await addColumnIfNeeded('sessions', 'longitude', "DECIMAL(10,7) NULL");
  await addColumnIfNeeded('sessions', 'radius_meters', "INT DEFAULT 100");
  await addColumnIfNeeded('sessions', 'session_lat', "DECIMAL(10,8) NULL");
  await addColumnIfNeeded('sessions', 'session_lng', "DECIMAL(11,8) NULL");
  await addColumnIfNeeded('sessions', 'session_radius', "INT NULL");
  await addColumnIfNeeded('sessions', 'venue_id', "INT NULL");
  await addColumnIfNeeded('sessions', 'ussd_session_code', "VARCHAR(10) NULL");

  // Columns for `attendance`
  await addColumnIfNeeded('attendance', 'attendance_method', "ENUM('qr','ussd','sms','computer','manual') DEFAULT 'qr'");

  // Indexes
  await addIndexIfNeeded('attendance', 'idx_att_student', 'student_id');
  await addIndexIfNeeded('attendance', 'idx_att_session', 'session_id');
  await addIndexIfNeeded('enrollments', 'idx_enroll_unit', 'unit_id');
  await addIndexIfNeeded('sessions', 'idx_sess_unit', 'unit_id');
  await addIndexIfNeeded('sessions', 'idx_sess_active', 'is_active');
  await addIndexIfNeeded('users', 'idx_users_phone', 'phone');
  await addIndexIfNeeded('sessions', 'idx_sess_ussd_code', 'ussd_session_code');
  await addIndexIfNeeded('users', 'idx_users_smartphone', 'has_smartphone');

  console.log('🎉 Database migrations and structures successfully applied!');
  await connection.end();
}

run().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
