-- ============================================================
-- MKU Attendance — No-Smartphone Support Migration
-- Adds columns for smartphone flag and attendance method tracking
-- ============================================================

-- 1. Add has_smartphone column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS has_smartphone TINYINT(1) NOT NULL DEFAULT 1;

-- 2. Add attendance_method to users for preferred method
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_attendance_method
    ENUM('qr','ussd','sms','computer','manual') DEFAULT 'qr';

-- 3. Add attendance_method to attendance table to track HOW each record was created
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS attendance_method
    ENUM('qr','ussd','sms','computer','manual') DEFAULT 'qr';

-- 4. Add ussd_session_code column to sessions for 6-char alphanumeric codes
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS ussd_session_code VARCHAR(10) NULL;

-- 5. Index for fast USSD/SMS code lookup
CREATE INDEX IF NOT EXISTS idx_sess_ussd_code ON sessions(ussd_session_code);

-- 6. Index for no-smartphone student queries
CREATE INDEX IF NOT EXISTS idx_users_smartphone ON users(has_smartphone);

SELECT 'No-smartphone migration complete!' AS result;
