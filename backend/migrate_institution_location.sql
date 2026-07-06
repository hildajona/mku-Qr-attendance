-- Migration: Add institution location fields to settings table
-- Run this once on any existing database that doesn't have these columns yet

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS geo_check_enabled        TINYINT(1)    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS institution_lat           DECIMAL(10,7) NULL,
  ADD COLUMN IF NOT EXISTS institution_lng           DECIMAL(10,7) NULL,
  ADD COLUMN IF NOT EXISTS institution_radius_meters INT           NOT NULL DEFAULT 200;

-- Ensure the default settings row exists
INSERT IGNORE INTO settings (id) VALUES (1);
