-- MKU Attendance System Database Schema
-- Run this file to set up the database

CREATE DATABASE IF NOT EXISTS mku_attendance
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mku_attendance;

-- Users table (students, lecturers, admins)
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'lecturer', 'student') NOT NULL DEFAULT 'student',
  reg_number    VARCHAR(100) UNIQUE,
  course        VARCHAR(255),
  department    VARCHAR(255),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_reg_number (reg_number)
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  code       VARCHAR(50) NOT NULL UNIQUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Units (belong to courses)
CREATE TABLE IF NOT EXISTS units (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  course_id  INT NOT NULL,
  name       VARCHAR(255) NOT NULL,
  code       VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_unit_code (course_id, code)
);

-- Student enrollments in units
CREATE TABLE IF NOT EXISTS enrollments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  unit_id    INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, unit_id)
);

-- Lecturer unit assignments
CREATE TABLE IF NOT EXISTS lecturer_assignments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  lecturer_id INT NOT NULL,
  unit_id     INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  UNIQUE KEY unique_assignment (lecturer_id, unit_id)
);

-- Class sessions
CREATE TABLE IF NOT EXISTS sessions (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  unit_id            INT NOT NULL,
  lecturer_id        INT NOT NULL,
  room               VARCHAR(100),
  classroom_name     VARCHAR(255),
  latitude           DECIMAL(10,7),
  longitude          DECIMAL(10,7),
  radius_meters      INT DEFAULT 100,
  started_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at         TIMESTAMP NULL,
  duration_minutes   INT DEFAULT 60,
  qr_token           VARCHAR(255) NOT NULL UNIQUE,
  qr_token_hash      VARCHAR(255) NOT NULL UNIQUE,
  qr_expiry_seconds  INT DEFAULT 300,
  is_active          BOOLEAN DEFAULT TRUE,
  ended_at           TIMESTAMP NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_qr_token (qr_token),
  INDEX idx_qr_token_hash (qr_token_hash),
  INDEX idx_is_active (is_active)
);

-- Attendance records
CREATE TABLE IF NOT EXISTS attendance (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  session_id  INT NOT NULL,
  student_id  INT NOT NULL,
  scanned_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status      ENUM('present', 'late', 'absent') NOT NULL DEFAULT 'present',
  ip_address  VARCHAR(45),
  device_info TEXT,
  gps_lat     DECIMAL(10,7),
  gps_lng     DECIMAL(10,7),
  gps_accuracy FLOAT,
  distance_from_class FLOAT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendance (session_id, student_id),
  INDEX idx_student_id (student_id),
  INDEX idx_session_id (session_id)
);

-- System settings
CREATE TABLE IF NOT EXISTS settings (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  university_name          VARCHAR(255) DEFAULT 'Mount Kenya University',
  qr_expiry_seconds        INT DEFAULT 300,
  email_notifications      BOOLEAN DEFAULT TRUE,
  low_attendance_threshold INT DEFAULT 75,
  allow_late_marking       BOOLEAN DEFAULT TRUE,
  late_threshold_minutes   INT DEFAULT 15,
  updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT IGNORE INTO settings (id) VALUES (1);

-- Seed admin user (password: admin123)
INSERT IGNORE INTO users (name, email, password_hash, role, is_active)
VALUES (
  'System Admin',
  'admin@mku.ac.ke',
  '$2a$10$Zxd/bvOKxkuaLFa4VkyzPu.DzXr3jIZbKML1rjZRTCO1vXChQb.Wq',
  'admin',
  TRUE
);

-- Seed lecturer (password: lecturer123)
INSERT IGNORE INTO users (name, email, password_hash, role, department, is_active)
VALUES (
  'Dr. James Mwangi',
  'lecturer@mku.ac.ke',
  '$2a$10$E4O2nQ7m9PD9lx11elU9UOK1eF.nDvvXAQhOngXpPekmOtheMbD1i',
  'lecturer',
  'Computer Science',
  TRUE
);

-- Seed student (password: student123)
INSERT IGNORE INTO users (name, email, password_hash, role, reg_number, course, is_active)
VALUES (
  'Alice Wanjiku',
  'alice@student.mku.ac.ke',
  '$2a$10$MVnGnsTIrbz83800ecYNSOugDFMPLWGufDX4fcNh.lUKFYiJRujYy',
  'student',
  'SCT211-0001/2024',
  'BSc Computer Science',
  TRUE
);
