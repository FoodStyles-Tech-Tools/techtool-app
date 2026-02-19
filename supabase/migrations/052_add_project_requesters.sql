-- Add per-project requester users (multi-select).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'projects'
      AND column_name = 'requester_ids'
  ) THEN
    ALTER TABLE projects
      ADD COLUMN requester_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_requester_ids
  ON projects USING GIN (requester_ids);
