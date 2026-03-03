-- Atomic status+reason update with reason comment creation.
CREATE OR REPLACE FUNCTION update_ticket_status_with_reason_comment(
  p_ticket_id UUID,
  p_actor_id UUID,
  p_status TEXT,
  p_reason_comment_body TEXT,
  p_reason JSONB DEFAULT NULL,
  p_set_reason BOOLEAN DEFAULT FALSE,
  p_started_at TIMESTAMPTZ DEFAULT NULL,
  p_set_started_at BOOLEAN DEFAULT FALSE,
  p_completed_at TIMESTAMPTZ DEFAULT NULL,
  p_set_completed_at BOOLEAN DEFAULT FALSE,
  p_epic_id UUID DEFAULT NULL,
  p_set_epic_id BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  ticket_id UUID,
  comment_id UUID
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ticket_id UUID;
  v_comment_id UUID;
BEGIN
  SELECT tickets.id
  INTO v_ticket_id
  FROM tickets
  WHERE tickets.id = p_ticket_id
  FOR UPDATE;

  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'Ticket not found'
      USING ERRCODE = 'P0001', DETAIL = 'ticket_not_found';
  END IF;

  UPDATE tickets
  SET
    status = p_status,
    reason = CASE WHEN p_set_reason THEN p_reason ELSE reason END,
    activity_actor_id = p_actor_id,
    started_at = CASE WHEN p_set_started_at THEN p_started_at ELSE started_at END,
    completed_at = CASE WHEN p_set_completed_at THEN p_completed_at ELSE completed_at END,
    epic_id = CASE WHEN p_set_epic_id THEN p_epic_id ELSE epic_id END
  WHERE id = p_ticket_id;

  INSERT INTO ticket_comments (
    ticket_id,
    parent_id,
    author_id,
    body
  )
  VALUES (
    p_ticket_id,
    NULL,
    p_actor_id,
    p_reason_comment_body
  )
  RETURNING id INTO v_comment_id;

  ticket_id := p_ticket_id;
  comment_id := v_comment_id;
  RETURN NEXT;
END;
$$;
