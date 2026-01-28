-- Make ticket status fully data-driven via ticket_statuses

-- Ensure all existing statuses are present in ticket_statuses before constraint
INSERT INTO ticket_statuses (key, label, sort_order, color)
SELECT DISTINCT t.status::text, initcap(replace(t.status::text, '_', ' ')), 0, '#9ca3af'
FROM tickets t
LEFT JOIN ticket_statuses s ON s.key = t.status::text
WHERE s.key IS NULL;

-- Change status column to text and set a default
ALTER TABLE tickets
  ALTER COLUMN status TYPE TEXT USING status::text;

ALTER TABLE tickets
  ALTER COLUMN status SET DEFAULT 'open';

-- Recreate status index for text
DROP INDEX IF EXISTS idx_tickets_status;
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Enforce status values via FK to ticket_statuses
ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_status_fkey;

ALTER TABLE tickets
  ADD CONSTRAINT tickets_status_fkey
  FOREIGN KEY (status) REFERENCES ticket_statuses(key)
  ON UPDATE CASCADE;
