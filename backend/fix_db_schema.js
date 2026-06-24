const mysql = require('mysql2/promise');

async function ensureColumn(conn, table, col, def) {
  const [rows] = await conn.query(
    'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    ['cams_attendance', table, col]
  );
  if (rows.length === 0) {
    console.log(`Adding ${col} to ${table}`);
    await conn.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  } else {
    console.log(`${col} already exists in ${table}`);
  }
}

(async () => {
  const conn = await mysql.createConnection({ host: '127.0.0.1', port: 330, user: 'root', password: 'root', database: 'cams_attendance' });
  try {
    await ensureColumn(conn, 'users', 'status', "ENUM('pending','active','suspended') NOT NULL DEFAULT 'active'");
    await ensureColumn(conn, 'users', 'has_smartphone', 'TINYINT(1) NOT NULL DEFAULT 1');
    await ensureColumn(conn, 'users', 'preferred_attendance_method', "ENUM('qr','ussd','sms','computer','manual') NOT NULL DEFAULT 'qr'");
    await ensureColumn(conn, 'students', 'student_reg_no', 'VARCHAR(100) NULL');
    await ensureColumn(conn, 'students', 'programme', 'VARCHAR(255) NULL');
    await ensureColumn(conn, 'students', 'department', 'VARCHAR(255) NULL');
    await ensureColumn(conn, 'students', 'semester', 'TINYINT NOT NULL DEFAULT 1');

    await conn.query('UPDATE students SET student_reg_no = admission_number WHERE student_reg_no IS NULL');
    await conn.query('UPDATE students SET semester = current_semester WHERE semester IS NULL');
    await conn.query(
      'UPDATE students s JOIN users u ON s.user_id = u.id SET s.programme = u.course, s.department = u.department WHERE s.programme IS NULL OR s.department IS NULL'
    );
    console.log('Database migration completed.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await conn.end();
  }
})();
