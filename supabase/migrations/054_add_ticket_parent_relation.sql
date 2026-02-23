-- Add "subtask" as a real ticket type and allow linking tickets to a parent ticket.
ALTER TYPE ticket_type ADD VALUE IF NOT EXISTS 'subtask';

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS parent_ticket_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tickets_parent_ticket_id_fkey'
  ) THEN
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_parent_ticket_id_fkey
      FOREIGN KEY (parent_ticket_id)
      REFERENCES tickets(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tickets_parent_ticket_id_not_self'
  ) THEN
    ALTER TABLE tickets
      ADD CONSTRAINT tickets_parent_ticket_id_not_self
      CHECK (parent_ticket_id IS NULL OR parent_ticket_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tickets_parent_ticket_id ON tickets(parent_ticket_id);
