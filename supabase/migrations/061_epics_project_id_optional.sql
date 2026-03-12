-- Make epics usable generally: project_id optional (global epics)
-- When a project is deleted, epics that belonged to it become global (SET NULL).

ALTER TABLE epics ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE epics
  DROP CONSTRAINT IF EXISTS epics_project_id_fkey;

ALTER TABLE epics
  ADD CONSTRAINT epics_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
