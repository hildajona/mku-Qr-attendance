-- ============================================================
-- MKU Attendance — Upgrade Polish Tables
-- ============================================================

-- 1. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  author_id INT NOT NULL,
  target_role ENUM('all', 'students', 'lecturers') DEFAULT 'all',
  course_id INT NULL,
  priority ENUM('normal', 'urgent') DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Academic Calendar Table
CREATE TABLE IF NOT EXISTS academic_calendar (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_name VARCHAR(255) NOT NULL,
  event_type ENUM('lecture_week', 'holiday', 'exam_period', 'cat_period', 'registration', 'graduation') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Attendance Excuse System Table
CREATE TABLE IF NOT EXISTS attendance_excuses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  excuse_type ENUM('Medical', 'Official MKU Activity', 'Bereavement') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  supporting_doc_url VARCHAR(500) NULL,
  note TEXT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewed_by INT NULL,
  review_note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. User Security Settings (2FA & IP whitelisting)
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS two_factor_enabled TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS backup_codes TEXT NULL,
  ADD COLUMN IF NOT EXISTS allowed_ip_ranges VARCHAR(500) NULL;

-- 5. User Devices Session Log
CREATE TABLE IF NOT EXISTS user_devices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  device VARCHAR(255) NULL,
  browser VARCHAR(100) NULL,
  ip_address VARCHAR(64) NULL,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
