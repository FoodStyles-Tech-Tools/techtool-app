-- Add per-user pinned projects for sidebar customization.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user_preferences'
      AND column_name = 'pinned_project_ids'
  ) THEN
    ALTER TABLE user_preferences
      ADD COLUMN pinned_project_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];
  END IF;
END $$;
