-- Remove project relation from sprints so they can be used everywhere.

ALTER TABLE sprints DROP CONSTRAINT IF EXISTS sprints_project_id_fkey;
ALTER TABLE sprints DROP COLUMN IF EXISTS project_id;

DROP INDEX IF EXISTS idx_sprints_project_id;
DROP INDEX IF EXISTS idx_sprints_project_created;
