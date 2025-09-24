-- Fix ticket sequence to prevent duplicate key violations
-- Run this in your Supabase SQL Editor

-- 1. Create a function to reset the ticket sequence
CREATE OR REPLACE FUNCTION reset_ticket_sequence(new_start_value INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Reset the sequence to start from the specified value
    EXECUTE format('ALTER SEQUENCE ticket_id_seq RESTART WITH %s', new_start_value);
    
    -- Log the change
    RAISE NOTICE 'Ticket sequence reset to start from %', new_start_value;
END;
$$ LANGUAGE plpgsql;

-- 2. Get the current max ticket ID
SELECT MAX(id) as max_ticket_id FROM ticket;

-- 3. Reset the sequence to be higher than the max ID (run this after getting the max ID)
-- Replace 1000 with (max_ticket_id + 1) from the query above
-- SELECT reset_ticket_sequence(1001);

-- 4. Verify the sequence is working
SELECT nextval('ticket_id_seq') as next_ticket_id;

-- 5. If you want to see the current sequence value
SELECT last_value FROM ticket_id_seq;
