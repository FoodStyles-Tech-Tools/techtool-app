-- Add new ticket statuses and a configurable status table

-- Add enum values if missing (only if enum type exists)
DO $$
BEGIN
  IF to_regtype('ticket_status') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumlabel = 'for_qa'
        AND enumtypid = 'ticket_status'::regtype
    ) THEN
      ALTER TYPE ticket_status ADD VALUE 'for_qa';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumlabel = 'qa_pass'
        AND enumtypid = 'ticket_status'::regtype
    ) THEN
      ALTER TYPE ticket_status ADD VALUE 'qa_pass';
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ticket_statuses (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#9ca3af',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ticket_statuses' AND column_name = 'color'
  ) THEN
    ALTER TABLE ticket_statuses ADD COLUMN color TEXT NOT NULL DEFAULT '#9ca3af';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ticket_statuses_sort_order ON ticket_statuses(sort_order);

DROP TRIGGER IF EXISTS update_ticket_statuses_updated_at ON ticket_statuses;
CREATE TRIGGER update_ticket_statuses_updated_at BEFORE UPDATE ON ticket_statuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE ticket_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ticket statuses" ON ticket_statuses;
DROP POLICY IF EXISTS "Admins can manage ticket statuses" ON ticket_statuses;

CREATE POLICY "Users can view ticket statuses"
  ON ticket_statuses FOR SELECT
  USING (user_has_permission('tickets'::permission_resource, 'view'::permission_action));

CREATE POLICY "Admins can manage ticket statuses"
  ON ticket_statuses FOR ALL
  USING (user_has_permission('settings'::permission_resource, 'manage'::permission_action));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ticket_statuses;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO ticket_statuses (key, label, sort_order, color)
VALUES
  ('open', 'Open', 10, '#9ca3af'),
  ('in_progress', 'In Progress', 20, '#f59e0b'),
  ('blocked', 'Blocked', 30, '#a855f7'),
  ('for_qa', 'For QA', 40, '#38bdf8'),
  ('qa_pass', 'QA Pass', 50, '#14b8a6'),
  ('completed', 'Completed', 80, '#22c55e'),
  ('cancelled', 'Cancelled', 90, '#ef4444')
ON CONFLICT (key) DO NOTHING;
