-- Add require_sqa flag to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS require_sqa BOOLEAN NOT NULL DEFAULT FALSE;
