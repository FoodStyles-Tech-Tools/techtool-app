-- Update ticket_status enum to only: open, in_progress, blocked, cancelled, completed
-- Create new enum with only the allowed values
CREATE TYPE ticket_status_new AS ENUM ('open', 'in_progress', 'blocked', 'cancelled', 'completed');

-- Update the tickets table to use the new enum
-- Map old values to new ones:
-- 'on_hold' -> 'blocked'
-- 'rejected' -> 'cancelled'
ALTER TABLE tickets 
  ALTER COLUMN status TYPE ticket_status_new 
  USING CASE 
    WHEN status::text = 'open' THEN 'open'::ticket_status_new
    WHEN status::text = 'in_progress' THEN 'in_progress'::ticket_status_new
    WHEN status::text = 'blocked' THEN 'blocked'::ticket_status_new
    WHEN status::text = 'cancelled' THEN 'cancelled'::ticket_status_new
    WHEN status::text = 'completed' THEN 'completed'::ticket_status_new
    WHEN status::text = 'on_hold' THEN 'blocked'::ticket_status_new
    WHEN status::text = 'rejected' THEN 'cancelled'::ticket_status_new
    ELSE 'open'::ticket_status_new
  END;

-- Drop the old enum and rename the new one
DROP TYPE ticket_status;
ALTER TYPE ticket_status_new RENAME TO ticket_status;


