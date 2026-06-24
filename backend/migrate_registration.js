const mysql = require('mysql2/promise');
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

  const sql = `
-- Update Users Table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM('pending','active','suspended') DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_smartphone BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;

-- Since name is full_name in the prompt, let's keep name and add full_name or just use name.
ALTER TABLE users CHANGE name full_name VARCHAR(150) NOT NULL;

-- Students table
CREATE TABLE IF NOT EXISTS students (
  user_id INT PRIMARY KEY,
  student_reg_no VARCHAR(30) NOT NULL UNIQUE,
  department VARCHAR(100),
  programme VARCHAR(100),
  year_of_study INT,
  semester INT,
  device_fingerprint VARCHAR(255),
  face_encoding TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Lecturers table
CREATE TABLE IF NOT EXISTS lecturers (
  user_id INT PRIMARY KEY,
  staff_id VARCHAR(30) NOT NULL UNIQUE,
  department VARCHAR(100),
  title VARCHAR(50),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  enrolled_by INT,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active','dropped','completed') DEFAULT 'active',
  UNIQUE(student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (enrolled_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Update super_admin enum if needed
ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','admin','lecturer','student') NOT NULL DEFAULT 'student';
`;

  try {
    await connection.query(sql);
    console.log('Database updated successfully for Registration Module.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await connection.end();
  }
}

run();
