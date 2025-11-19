-- Fix display_id generation to use advisory locks and MAX-based approach
-- This prevents duplicate key violations by serializing ID generation

-- Update function to generate the next HRB ticket ID using advisory locks
CREATE OR REPLACE FUNCTION generate_ticket_display_id()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  lock_key BIGINT := 123456789; -- Arbitrary lock key for ticket ID generation
BEGIN
  -- Only generate if display_id is not already set
  IF NEW.display_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Acquire advisory lock to serialize ID generation
  -- This prevents race conditions when multiple tickets are inserted concurrently
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Find the maximum existing display_id number
  -- Extract numeric part from HRB-XXX format
  SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM tickets
  WHERE display_id IS NOT NULL 
    AND display_id ~ '^HRB-[0-9]+$';

  -- Set the display_id as HRB-{number}
  NEW.display_id := 'HRB-' || next_number;

  -- Lock is automatically released when transaction commits/rolls back
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists from migration 008, so we don't need to recreate it
-- But we'll ensure it's properly configured
DROP TRIGGER IF EXISTS generate_ticket_display_id_trigger ON tickets;
CREATE TRIGGER generate_ticket_display_id_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  WHEN (NEW.display_id IS NULL)
  EXECUTE FUNCTION generate_ticket_display_id();

-- Note: The ticket_number_seq sequence can be kept for backward compatibility
-- but is no longer used. It can be dropped in a future migration if desired.
-- DROP SEQUENCE IF EXISTS ticket_number_seq;

