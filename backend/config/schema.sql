-- CAMS – Campus Attendance Management System
-- Production Schema — optimised for 10,000+ students
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS cams_attendance
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cams_attendance;

-- ── Users (students, lecturers, admins) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','lecturer','student') NOT NULL DEFAULT 'student',
  reg_number    VARCHAR(100) NULL,
  course        VARCHAR(255) NULL,
  department    VARCHAR(255) NULL,
  phone         VARCHAR(30)  NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email       (email),
  UNIQUE KEY uq_reg_number  (reg_number),
  KEY idx_role              (role),
  KEY idx_is_active         (is_active),
  KEY idx_course            (course)
) ENGINE=InnoDB;

-- ── Courses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id           INT          NOT NULL AUTO_INCREMENT,
  name         VARCHAR(255) NOT NULL,
  code         VARCHAR(50)  NOT NULL,
  department_id INT         NULL,
  created_by   VARCHAR(36)  NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_code (code),
  KEY idx_course_department (department_id),
  KEY idx_created_by (created_by),
  CONSTRAINT fk_course_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_course_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Units ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
  id           INT          NOT NULL AUTO_INCREMENT,
  course_id    INT          NOT NULL,
  department_id INT         NULL,
  name         VARCHAR(255) NOT NULL,
  code         VARCHAR(50)  NOT NULL,
  semester     TINYINT      NOT NULL,
  academic_year VARCHAR(9)  NOT NULL,
  credit_hours INT          NOT NULL DEFAULT 3,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_unit_course (course_id, code),
  KEY idx_course_id (course_id),
  KEY idx_unit_department (department_id),
  CONSTRAINT fk_unit_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_unit_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Enrollments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id          INT          NOT NULL AUTO_INCREMENT,
  student_id  VARCHAR(36)  NOT NULL,
  unit_id     INT          NOT NULL,
  enrolled_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enrollment (student_id, unit_id),
  KEY idx_enroll_student (student_id),
  KEY idx_enroll_unit    (unit_id),
  CONSTRAINT fk_enroll_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_enroll_unit    FOREIGN KEY (unit_id)    REFERENCES units(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Lecturer assignments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lecturer_assignments (
  id          INT         NOT NULL AUTO_INCREMENT,
  lecturer_id VARCHAR(36) NOT NULL,
  unit_id     INT         NOT NULL,
  assigned_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_assignment (lecturer_id, unit_id),
  KEY idx_assign_lecturer (lecturer_id),
  KEY idx_assign_unit     (unit_id),
  CONSTRAINT fk_assign_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_assign_unit     FOREIGN KEY (unit_id)     REFERENCES units(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Sessions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id                VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  unit_id           INT          NOT NULL,
  lecturer_id       VARCHAR(36)  NOT NULL,
  room              VARCHAR(100) NULL,
  classroom_name    VARCHAR(255) NULL,
  started_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at        DATETIME     NOT NULL,
  ended_at          DATETIME     NULL,
  duration_minutes  INT          NOT NULL DEFAULT 60,
  qr_token          VARCHAR(512) NOT NULL,
  qr_expiry_seconds INT          NOT NULL DEFAULT 300,
  is_active         TINYINT(1)   NOT NULL DEFAULT 1,
  -- Optional geo-fencing
  lat               DECIMAL(10,7) NULL,
  lng               DECIMAL(10,7) NULL,
  radius_meters     INT           NULL DEFAULT 100,
  PRIMARY KEY (id),
  UNIQUE KEY uq_qr_token   (qr_token(191)),
  KEY idx_session_unit     (unit_id),
  KEY idx_session_lecturer (lecturer_id),
  KEY idx_session_active   (is_active),
  KEY idx_session_date     (started_at),
  CONSTRAINT fk_session_unit     FOREIGN KEY (unit_id)     REFERENCES units(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Attendance (high-write table, composite unique prevents duplicates) ────
CREATE TABLE IF NOT EXISTS attendance (
  id                BIGINT       NOT NULL AUTO_INCREMENT,
  session_id        VARCHAR(36)  NOT NULL,
  student_id        VARCHAR(36)  NOT NULL,
  scanned_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  status            ENUM('present','late','absent') NOT NULL DEFAULT 'present',
  device_fingerprint VARCHAR(255) NULL,
  ip_address        VARCHAR(45)  NULL,
  lat               DECIMAL(10,7) NULL,
  lng               DECIMAL(10,7) NULL,
  PRIMARY KEY (id),
  -- Composite unique: one scan per student per session (DB-level anti-cheat)
  UNIQUE KEY uq_attendance (session_id, student_id),
  KEY idx_att_student  (student_id),
  KEY idx_att_session  (session_id),
  KEY idx_att_date     (scanned_at),
  KEY idx_att_status   (status),
  CONSTRAINT fk_att_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Scan rate-limit log (anti-cheat: max 3 attempts/student/session) ───────
CREATE TABLE IF NOT EXISTS scan_attempts (
  id          BIGINT      NOT NULL AUTO_INCREMENT,
  student_id  VARCHAR(36) NOT NULL,
  session_id  VARCHAR(36) NOT NULL,
  attempted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  success     TINYINT(1)  NOT NULL DEFAULT 0,
  ip_address  VARCHAR(45) NULL,
  reason      VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_scan_student (student_id),
  KEY idx_scan_session (session_id),
  KEY idx_scan_time    (attempted_at)
) ENGINE=InnoDB;

-- ── System settings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id                          INT          NOT NULL DEFAULT 1,
  university_name             VARCHAR(255) NOT NULL DEFAULT 'CAMS – Campus Attendance Management System',
  qr_expiry_seconds           INT          NOT NULL DEFAULT 300,
  email_notifications         TINYINT(1)   NOT NULL DEFAULT 1,
  low_attendance_threshold    INT          NOT NULL DEFAULT 75,
  allow_late_marking          TINYINT(1)   NOT NULL DEFAULT 1,
  late_threshold_minutes      INT          NOT NULL DEFAULT 15,
  max_scan_attempts           INT          NOT NULL DEFAULT 3,
  geo_check_enabled           TINYINT(1)   NOT NULL DEFAULT 0,
  institution_lat             DECIMAL(10,7) NULL,
  institution_lng             DECIMAL(10,7) NULL,
  institution_radius_meters   INT          NOT NULL DEFAULT 200,
  updated_at                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT IGNORE INTO settings (id) VALUES (1);

-- ── MKU Academic Structure ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id           INT          NOT NULL AUTO_INCREMENT,
  name         ENUM('super_admin','school_admin','admin','lecturer','student') NOT NULL,
  description  VARCHAR(255) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS schools (
  id           INT          NOT NULL AUTO_INCREMENT,
  name         VARCHAR(255) NOT NULL,
  code         VARCHAR(50)  NOT NULL,
  campus       VARCHAR(255) NULL,
  description  TEXT         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_school_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS departments (
  id           INT          NOT NULL AUTO_INCREMENT,
  school_id    INT          NOT NULL,
  name         VARCHAR(255) NOT NULL,
  code         VARCHAR(50)  NOT NULL,
  description  TEXT         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_department_code (school_id, code),
  KEY idx_department_school (school_id),
  CONSTRAINT fk_department_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id               VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  user_id          VARCHAR(36)  NOT NULL,
  admission_number VARCHAR(100) NOT NULL,
  year_of_study    TINYINT      NOT NULL DEFAULT 1,
  current_semester TINYINT      NOT NULL DEFAULT 1,
  registration_date DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_admission (admission_number),
  KEY idx_student_user (user_id),
  CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lecturers (
  id               VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  user_id          VARCHAR(36)  NOT NULL,
  employee_number  VARCHAR(100) NOT NULL,
  school_id        INT          NULL,
  department_id    INT          NULL,
  title            VARCHAR(100) NULL,
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lecturer_employee (employee_number),
  KEY idx_lecturer_user (user_id),
  KEY idx_lecturer_school (school_id),
  KEY idx_lecturer_department (department_id),
  CONSTRAINT fk_lecturer_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lecturer_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
  CONSTRAINT fk_lecturer_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_units (
  id               INT          NOT NULL AUTO_INCREMENT,
  student_id       VARCHAR(36)  NOT NULL,
  unit_id          INT          NOT NULL,
  registration_year VARCHAR(9)  NOT NULL,
  semester         TINYINT      NOT NULL,
  status           ENUM('registered','dropped','completed') NOT NULL DEFAULT 'registered',
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_unit (student_id, unit_id),
  KEY idx_student_unit_student (student_id),
  KEY idx_student_unit_unit (unit_id),
  CONSTRAINT fk_student_units_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_units_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lecturer_units (
  id               INT          NOT NULL AUTO_INCREMENT,
  lecturer_id      VARCHAR(36)  NOT NULL,
  unit_id          INT          NOT NULL,
  assigned_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lecturer_unit (lecturer_id, unit_id),
  KEY idx_lecturer_unit_lecturer (lecturer_id),
  KEY idx_lecturer_unit_unit (unit_id),
  CONSTRAINT fk_lecturer_units_lecturer FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE,
  CONSTRAINT fk_lecturer_units_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id                VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  unit_id           INT          NOT NULL,
  lecturer_id       VARCHAR(36)  NOT NULL,
  session_code      VARCHAR(64)  NOT NULL,
  room              VARCHAR(100) NULL,
  scheduled_date    DATE         NOT NULL,
  start_time        TIME         NOT NULL,
  end_time          TIME         NULL,
  qr_token          VARCHAR(512) NOT NULL,
  qr_expires_at     DATETIME     NOT NULL,
  qr_expiry_seconds INT          NOT NULL DEFAULT 300,
  status            ENUM('scheduled','active','closed','cancelled') NOT NULL DEFAULT 'scheduled',
  latitude          DECIMAL(10,7) NULL,
  longitude         DECIMAL(10,7) NULL,
  gps_radius_meters INT          DEFAULT 100,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_session_qr (qr_token(191)),
  KEY idx_attendance_session_unit (unit_id),
  KEY idx_attendance_session_lecturer (lecturer_id),
  KEY idx_attendance_session_status (status),
  CONSTRAINT fk_attendance_session_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_session_lecturer FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_records (
  id                BIGINT       NOT NULL AUTO_INCREMENT,
  session_id        VARCHAR(36)  NOT NULL,
  student_id        VARCHAR(36)  NOT NULL,
  scanned_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  status            ENUM('present','late','absent') NOT NULL DEFAULT 'present',
  device_fingerprint VARCHAR(255) NULL,
  ip_address        VARCHAR(45)  NULL,
  latitude          DECIMAL(10,7) NULL,
  longitude         DECIMAL(10,7) NULL,
  attendance_method ENUM('qr','ussd','computer','manual') NOT NULL DEFAULT 'qr',
  override_reason   VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_record (session_id, student_id),
  KEY idx_attendance_record_student (student_id),
  KEY idx_attendance_record_session (session_id),
  KEY idx_attendance_record_date (scanned_at),
  CONSTRAINT fk_attendance_record_session FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_record_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO roles (name, description) VALUES
  ('super_admin', 'Full system access for MKU central administration'),
  ('school_admin', 'Manages departments, lecturers, students, and units within a school'),
  ('admin', 'System administrator with global privileges'),
  ('lecturer', 'Assigned lecturer who can generate QR attendance sessions'),
  ('student', 'Student with QR attendance and report access');

INSERT IGNORE INTO schools (id, name, code, campus, description) VALUES
  (1, 'School of Computing and Informatics', 'SCI', 'Thika Campus', 'Computer Science, IT, Information Systems, Software Engineering'),
  (2, 'School of Business and Economics', 'SBE', 'Thika Campus', 'Accounting, Finance, Marketing, HRM, Procurement'),
  (3, 'School of Education', 'SED', 'Thika Campus', 'Early Childhood, Primary, Secondary Education'),
  (4, 'School of Social Sciences', 'SSS', 'Thika Campus', 'Sociology, Psychology, Journalism, Criminology'),
  (5, 'School of Pure and Applied Sciences', 'SPAS', 'Thika Campus', 'Mathematics, Chemistry, Physics, Biology'),
  (6, 'School of Engineering, Energy and the Built Environment', 'SEEBE', 'Thika Campus', 'Civil, Electrical, Mechanical, Architecture'),
  (7, 'School of Law', 'SLW', 'Thika Campus', 'Corporate Law, Criminal Law, International Law'),
  (8, 'School of Nursing', 'SNRS', 'Thika Campus', 'General Nursing, Psychiatric Nursing, Midwifery'),
  (9, 'School of Public Health', 'SPH', 'Thika Campus', 'Environmental Health, Epidemiology'),
  (10, 'School of Pharmacy', 'SPHARM', 'Thika Campus', 'Pharmaceutical Sciences, Clinical Pharmacy'),
  (11, 'School of Clinical Medicine', 'SCM', 'Thika Campus', 'Internal Medicine, Surgery, Pediatrics'),
  (12, 'Medical School', 'MED', 'Thika Campus', 'Anatomy, Physiology, Pathology, Community Health');

INSERT IGNORE INTO departments (school_id, name, code, description) VALUES
  (1, 'Information Technology', 'IT', 'Information Technology department'),
  (1, 'Computer Science', 'CS', 'Computer Science department'),
  (1, 'Information Systems', 'IS', 'Information Systems department'),
  (2, 'Accounting', 'ACC', 'Accounting department'),
  (2, 'Finance', 'FIN', 'Finance department'),
  (2, 'Marketing', 'MKT', 'Marketing department'),
  (3, 'Early Childhood Education', 'ECE', 'Early Childhood Education'),
  (4, 'Sociology', 'SOC', 'Sociology department'),
  (5, 'Mathematics', 'MATH', 'Mathematics department'),
  (6, 'Civil Engineering', 'CIV', 'Civil Engineering department'),
  (7, 'Law', 'LAW', 'Law department'),
  (8, 'Nursing', 'NURS', 'Nursing department'),
  (9, 'Public Health', 'PH', 'Public Health department'),
  (10, 'Pharmacy', 'PHARM', 'Pharmacy department'),
  (11, 'Clinical Medicine', 'MEDCL', 'Clinical Medicine department'),
  (12, 'Medical Sciences', 'MEDSC', 'Medical School department');

INSERT IGNORE INTO courses (id, name, code, department_id, created_by) VALUES
  (1, 'Bachelor of Science in Computer Science', 'BSC-CS', 2, NULL),
  (2, 'Bachelor of Science in Information Technology', 'BSC-IT', 1, NULL),
  (3, 'Bachelor of Science in Mathematics', 'BSC-MATH', 5, NULL);

INSERT IGNORE INTO units (id, course_id, department_id, name, code, semester, academic_year, credit_hours) VALUES
  (1, 1, 2, 'Data Structures & Algorithms', 'SCS 201', 2, '2025/2026', 3),
  (2, 1, 2, 'Database Systems', 'SCS 202', 2, '2025/2026', 3),
  (3, 1, 2, 'Operating Systems', 'SCS 203', 2, '2025/2026', 3),
  (4, 2, 1, 'Web Development', 'SIT 201', 2, '2025/2026', 3),
  (5, 2, 1, 'Network Administration', 'SIT 202', 2, '2025/2026', 3),
  (6, 3, 5, 'Calculus II', 'SMA 201', 2, '2025/2026', 3),
  (7, 3, 5, 'Linear Algebra', 'SMA 202', 2, '2025/2026', 3);

INSERT IGNORE INTO settings (id, university_name, qr_expiry_seconds, email_notifications, low_attendance_threshold, allow_late_marking, late_threshold_minutes, max_scan_attempts, geo_check_enabled)
VALUES (1, 'MKU CAMS – Campus Attendance Management System', 300, 1, 75, 1, 15, 3, 1);

-- ── Seed users ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO users (id, full_name, email, password_hash, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'System Admin', 'admin@cams.ac.ke',
        '$2b$10$oqYAob00fCnR58QEtCE3sO4L34m0mRzHM15Ho72coAUdex75sfJne', 'admin', 1);

INSERT IGNORE INTO users (id, full_name, email, password_hash, role, department, is_active)
VALUES ('00000000-0000-0000-0000-000000000002', 'Dr. James Mwangi', 'lecturer@cams.ac.ke',
        '$2b$10$L.uNmPw719M9zhScvOx0IOlVt7P1eAQXLSrK.Hg/xB7ZciiVvWyCG', 'lecturer', 'Computer Science', 1);

INSERT IGNORE INTO users (id, full_name, email, password_hash, role, reg_number, course, is_active)
VALUES ('00000000-0000-0000-0000-000000000003', 'Alice Wanjiku', 'alice@student.cams.ac.ke',
        '$2b$10$KFt9bDHH4u1UACptDg9Xd.jhPWVUM2LI7Mtn9hH3pvPsMxyTmHowe', 'student', 'SCT211-0001/2024', 'BSc Computer Science', 1);
