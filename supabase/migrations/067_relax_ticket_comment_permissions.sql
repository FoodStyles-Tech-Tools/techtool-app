-- Relax ticket comment creation permissions:
-- allow any user who can view a ticket to create comments/replies on it.

-- Ensure RLS is enabled (no-op if already enabled).
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- Replace the existing INSERT policy to drop the tickets:edit requirement.
DROP POLICY IF EXISTS "Users can create ticket comments" ON ticket_comments;

CREATE POLICY "Users can create ticket comments"
  ON ticket_comments FOR INSERT
  WITH CHECK (
    author_id = current_user_id()
    AND EXISTS (
      SELECT 1
      FROM tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND user_has_permission('tickets'::permission_resource, 'view'::permission_action)
    )
  );

