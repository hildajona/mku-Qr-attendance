-- ============================================================
-- MKU Attendance — Phase 1-4 Migration
-- Run this against your mku_attendance database
-- ============================================================

-- 1. login_attempts — tracks failed logins per phone/email for lockout
CREATE TABLE IF NOT EXISTS login_attempts (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  identifier    VARCHAR(255) NOT NULL,
  ip_address    VARCHAR(64),
  attempted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_la_identifier (identifier),
  INDEX idx_la_ip (ip_address)
);

-- 2. otp_codes — OTP store (forgot password / phone verification)
CREATE TABLE IF NOT EXISTS otp_codes (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  identifier  VARCHAR(255) NOT NULL,   -- phone or reg_no
  otp_hash    VARCHAR(255) NOT NULL,   -- bcrypt hash of 6-digit code
  purpose     ENUM('forgot_password','phone_verify') DEFAULT 'forgot_password',
  expires_at  TIMESTAMP NOT NULL,
  used        TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_identifier (identifier)
);

-- 3. refresh_tokens — httpOnly cookie refresh token store
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     VARCHAR(36) NOT NULL,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked     TINYINT(1) DEFAULT 0,
  INDEX idx_rt_user (user_id),
  INDEX idx_rt_token (token_hash)
);

-- 4. audit_logs — every admin/system action
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     VARCHAR(36),
  action      VARCHAR(100) NOT NULL,
  target      VARCHAR(255),
  detail      TEXT,
  ip_address  VARCHAR(64),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_al_user (user_id),
  INDEX idx_al_action (action),
  INDEX idx_al_created (created_at)
);

-- 5. attendance_appeals — student dispute flow
CREATE TABLE IF NOT EXISTS attendance_appeals (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  student_id   VARCHAR(36) NOT NULL,
  session_id   VARCHAR(36) NOT NULL,
  reason       TEXT NOT NULL,
  evidence_url VARCHAR(500),
  status       ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by  VARCHAR(36),
  review_note  TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_appeal_student (student_id),
  INDEX idx_appeal_session (session_id),
  INDEX idx_appeal_status (status)
);

-- 6. settings — system-wide config (one row)
CREATE TABLE IF NOT EXISTS settings (
  id                        INT PRIMARY KEY DEFAULT 1,
  university_name           VARCHAR(255) DEFAULT 'Mount Kenya University',
  min_attendance_pct        INT DEFAULT 75,
  late_threshold_minutes    INT DEFAULT 15,
  qr_expiry_seconds         INT DEFAULT 300,
  rotating_code_interval    INT DEFAULT 120,
  sms_on_absent             TINYINT(1) DEFAULT 1,
  sms_on_low_attendance     TINYINT(1) DEFAULT 1,
  sms_on_lock               TINYINT(1) DEFAULT 1,
  sms_on_session_open       TINYINT(1) DEFAULT 0,
  max_login_attempts        INT DEFAULT 5,
  lockout_minutes           INT DEFAULT 30,
  updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed default settings if not exists
INSERT IGNORE INTO settings (id) VALUES (1);

-- 7. Performance indexes
-- Indexes are already defined in schema.sql, so these statements are skipped.

-- 8. Add phone and security columns to users
-- phone is already included in schema.sql
ALTER TABLE users ADD COLUMN failed_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL;

-- 9. Add rotating_code to sessions
ALTER TABLE sessions ADD COLUMN rotating_code VARCHAR(10);
ALTER TABLE sessions ADD COLUMN rotating_code_expires TIMESTAMP NULL DEFAULT NULL;

SELECT 'Migration complete!' AS result;
