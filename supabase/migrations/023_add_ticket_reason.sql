-- Add reason column to tickets table as JSONB
ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS reason JSONB DEFAULT NULL;

-- Add index on reason for potential queries
CREATE INDEX IF NOT EXISTS idx_tickets_reason ON tickets USING GIN (reason);

