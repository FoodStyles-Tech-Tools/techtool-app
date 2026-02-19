-- Disable ticket deletion from app roles.
-- This keeps tickets immutable from delete actions while allowing edits/history.

DROP POLICY IF EXISTS "Users can delete tickets with permission" ON tickets;

-- Clean up explicit ticket-delete permission rows if they exist.
DELETE FROM permissions
WHERE resource = 'tickets'::permission_resource
  AND action = 'delete'::permission_action;
