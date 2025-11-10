-- Migration: Sync Ticket Sequence Function
-- This function automatically syncs the ticket_id_seq sequence to prevent duplicate key errors
-- Run this in your Supabase SQL Editor

-- Function to sync the ticket sequence
CREATE OR REPLACE FUNCTION sync_ticket_sequence(max_id INTEGER DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_max_id INTEGER;
  current_seq_val BIGINT;
BEGIN
  -- Get the current maximum ID from the ticket table
  IF max_id IS NULL THEN
    SELECT COALESCE(MAX(id), 0) INTO current_max_id FROM ticket;
  ELSE
    current_max_id := max_id;
  END IF;
  
  -- Get the current sequence value
  SELECT last_value INTO current_seq_val FROM ticket_id_seq;
  
  -- If the sequence is behind the max ID, update it
  IF current_seq_val <= current_max_id THEN
    -- Set the sequence to be higher than the max ID
    PERFORM setval('ticket_id_seq', GREATEST(current_max_id + 1, 1), true);
    RAISE NOTICE 'Sequence synced: ticket_id_seq set to %', GREATEST(current_max_id + 1, 1);
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION sync_ticket_sequence(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_ticket_sequence(INTEGER) TO anon;

-- Optional: Create a trigger that automatically syncs the sequence after INSERT
-- This provides an additional safety net
CREATE OR REPLACE FUNCTION auto_sync_ticket_sequence()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- After each insert, ensure the sequence is at least at the inserted ID
  IF NEW.id IS NOT NULL THEN
    PERFORM setval('ticket_id_seq', GREATEST(NEW.id, (SELECT last_value FROM ticket_id_seq)), true);
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger (optional but recommended)
DROP TRIGGER IF EXISTS trigger_auto_sync_ticket_sequence ON ticket;
CREATE TRIGGER trigger_auto_sync_ticket_sequence
  AFTER INSERT ON ticket
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_ticket_sequence();

-- Run this once to sync the sequence to the current max ID
SELECT sync_ticket_sequence();
