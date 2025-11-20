-- Add epic_id column to tickets table
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS epic_id UUID REFERENCES epics(id) ON DELETE SET NULL;

-- Create index on epic_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_epic_id ON tickets(epic_id);

