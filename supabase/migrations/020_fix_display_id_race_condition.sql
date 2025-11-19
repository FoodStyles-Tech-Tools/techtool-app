-- Fix display_id generation to prevent race conditions completely
-- This uses a sequence which is thread-safe and handles concurrency automatically

-- Ensure the sequence exists and is properly initialized
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq;

-- Set the sequence to start after the highest existing number
DO $$
DECLARE
  max_number INTEGER;
BEGIN
  -- Find the maximum existing display_id number
  SELECT COALESCE(MAX(CAST(SUBSTRING(display_id FROM 5) AS INTEGER)), 0)
  INTO max_number
  FROM tickets
  WHERE display_id IS NOT NULL 
    AND display_id ~ '^HRB-[0-9]+$';
  
  -- Set sequence to start from max_number + 1
  PERFORM setval('ticket_number_seq', GREATEST(max_number, 0), false);
END $$;

-- Drop the trigger first (it depends on the function)
DROP TRIGGER IF EXISTS generate_ticket_display_id_trigger ON tickets;

-- Drop the old function
DROP FUNCTION IF EXISTS generate_ticket_display_id();

-- Create a robust function using sequence (which is thread-safe)
CREATE OR REPLACE FUNCTION generate_ticket_display_id()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  lock_key BIGINT := 123456789; -- Arbitrary lock key for ticket ID generation
  max_retries INTEGER := 10;
  retry_count INTEGER := 0;
  display_id_value TEXT;
BEGIN
  -- Only generate if display_id is not already set
  IF NEW.display_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Retry loop to handle potential conflicts
  LOOP
    -- Acquire advisory lock to serialize ID generation
    PERFORM pg_advisory_xact_lock(lock_key);

    -- Use sequence to get next number (thread-safe)
    next_number := nextval('ticket_number_seq');

    -- Generate the display_id
    display_id_value := 'HRB-' || next_number;

    -- Check if this display_id already exists (double-check after getting sequence value)
    -- This handles edge cases where sequence might have gaps or conflicts
    IF NOT EXISTS (SELECT 1 FROM tickets WHERE display_id = display_id_value) THEN
      NEW.display_id := display_id_value;
      EXIT; -- Success, exit the loop
    END IF;

    -- If we get here, there was a conflict - try next sequence value
    retry_count := retry_count + 1;
    IF retry_count >= max_retries THEN
      -- If we've retried too many times, something is seriously wrong
      RAISE EXCEPTION 'Failed to generate unique display_id after % retries', max_retries;
    END IF;

    -- Continue loop to try next sequence value
  END LOOP;

  -- Lock is automatically released when transaction commits/rolls back
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (it was already dropped above)
CREATE TRIGGER generate_ticket_display_id_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  WHEN (NEW.display_id IS NULL)
  EXECUTE FUNCTION generate_ticket_display_id();

