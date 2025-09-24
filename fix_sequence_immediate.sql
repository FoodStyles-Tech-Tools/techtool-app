-- IMMEDIATE FIX: Reset ticket sequence to correct value
-- Your last ticket ID is 1163, so we need to set sequence to 1164

-- Option 1: Direct sequence reset (recommended)
SELECT setval('ticket_id_seq', 1164, false);

-- Option 2: Using the function (if you created it)
-- SELECT reset_ticket_sequence(1164);

-- Verify the fix
SELECT last_value FROM ticket_id_seq;
SELECT nextval('ticket_id_seq') as next_id;
