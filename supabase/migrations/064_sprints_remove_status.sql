-- Remove sprint status entirely.

DROP INDEX IF EXISTS idx_sprints_status;
ALTER TABLE sprints DROP COLUMN IF EXISTS status;
DROP TYPE IF EXISTS sprint_status;
