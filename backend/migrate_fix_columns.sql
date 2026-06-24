-- Add missing sessions table columns for MKU Thika Campus DB schema
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS classroom_name VARCHAR(255) NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7) NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7) NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS radius_meters INT DEFAULT 100;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_lat DECIMAL(10,8) NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_lng DECIMAL(11,8) NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_radius INT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS venue_id INT NULL;
SELECT 'Fix columns migration complete!' AS result;
