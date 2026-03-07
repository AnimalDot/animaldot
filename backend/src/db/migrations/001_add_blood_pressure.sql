-- Add blood pressure columns to existing vitals table.
-- Run for existing DBs: psql $DATABASE_URL -f src/db/migrations/001_add_blood_pressure.sql

ALTER TABLE vitals ADD COLUMN IF NOT EXISTS systolic_mmhg INTEGER;
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS diastolic_mmhg INTEGER;
