-- Remove project and sprint relation from epics so they can be used everywhere.

-- Drop trigger that syncs epic sprint_id to tickets (epics no longer have sprint_id)
DROP TRIGGER IF EXISTS trigger_update_tickets_on_epic_sprint_change ON epics;

-- Drop sprint_id from epics (drops FK and index)
ALTER TABLE epics DROP COLUMN IF EXISTS sprint_id;

-- Drop project_id from epics
ALTER TABLE epics DROP CONSTRAINT IF EXISTS epics_project_id_fkey;
ALTER TABLE epics DROP COLUMN IF EXISTS project_id;

-- Drop indexes that referenced project_id
DROP INDEX IF EXISTS idx_epics_project_id;
DROP INDEX IF EXISTS idx_epics_project_created;
DROP INDEX IF EXISTS idx_epics_sprint_id;
