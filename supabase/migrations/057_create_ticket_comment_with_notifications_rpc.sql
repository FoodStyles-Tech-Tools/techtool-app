-- Atomic comment creation + mention + notification fanout.
CREATE OR REPLACE FUNCTION create_ticket_comment_with_notifications(
  p_ticket_id UUID,
  p_author_id UUID,
  p_body TEXT,
  p_parent_id UUID DEFAULT NULL,
  p_mention_user_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS TABLE (
  comment_id UUID,
  ticket_id UUID,
  parent_id UUID,
  author_id UUID,
  body TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  mention_user_ids UUID[],
  notification_count INTEGER
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_comment ticket_comments%ROWTYPE;
  v_unique_mentions UUID[] := '{}'::UUID[];
  v_reply_recipients UUID[] := '{}'::UUID[];
  v_parent_ticket_id UUID;
  v_target_user UUID;
  v_rows INTEGER := 0;
  v_notification_count INTEGER := 0;
BEGIN
  PERFORM 1
  FROM tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found'
      USING ERRCODE = 'P0001', DETAIL = 'ticket_not_found';
  END IF;

  IF p_parent_id IS NOT NULL THEN
    SELECT ticket_comments.ticket_id
    INTO v_parent_ticket_id
    FROM ticket_comments
    WHERE ticket_comments.id = p_parent_id;

    IF v_parent_ticket_id IS NULL THEN
      RAISE EXCEPTION 'Parent comment not found'
        USING ERRCODE = 'P0001', DETAIL = 'parent_comment_not_found';
    END IF;

    IF v_parent_ticket_id <> p_ticket_id THEN
      RAISE EXCEPTION 'Parent comment does not belong to ticket'
        USING ERRCODE = 'P0001', DETAIL = 'parent_comment_ticket_mismatch';
    END IF;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT mention_id), '{}'::UUID[])
  INTO v_unique_mentions
  FROM unnest(COALESCE(p_mention_user_ids, '{}'::UUID[])) AS mention_id
  WHERE mention_id IS NOT NULL
    AND mention_id <> p_author_id;

  INSERT INTO ticket_comments (
    ticket_id,
    parent_id,
    author_id,
    body
  )
  VALUES (
    p_ticket_id,
    p_parent_id,
    p_author_id,
    p_body
  )
  RETURNING *
  INTO v_comment;

  IF COALESCE(array_length(v_unique_mentions, 1), 0) > 0 THEN
    INSERT INTO comment_mentions (comment_id, user_id)
    SELECT v_comment.id, mention_id
    FROM unnest(v_unique_mentions) AS mention_id
    ON CONFLICT (comment_id, user_id) DO NOTHING;
  END IF;

  IF p_parent_id IS NOT NULL THEN
    SELECT ticket_comments.author_id
    INTO v_target_user
    FROM ticket_comments
    WHERE ticket_comments.id = p_parent_id;

    IF v_target_user IS NOT NULL AND v_target_user <> p_author_id THEN
      v_reply_recipients := array_append(v_reply_recipients, v_target_user);
    END IF;

    FOR v_target_user IN
      SELECT DISTINCT comment_mentions.user_id
      FROM comment_mentions
      WHERE comment_mentions.comment_id = p_parent_id
    LOOP
      IF v_target_user IS NOT NULL
        AND v_target_user <> p_author_id
        AND NOT (v_target_user = ANY(v_reply_recipients))
      THEN
        v_reply_recipients := array_append(v_reply_recipients, v_target_user);
      END IF;
    END LOOP;

    FOR v_target_user IN
      SELECT DISTINCT ticket_comments.author_id
      FROM ticket_comments
      WHERE ticket_comments.parent_id = p_parent_id
        AND ticket_comments.id <> v_comment.id
    LOOP
      IF v_target_user IS NOT NULL
        AND v_target_user <> p_author_id
        AND NOT (v_target_user = ANY(v_reply_recipients))
      THEN
        v_reply_recipients := array_append(v_reply_recipients, v_target_user);
      END IF;
    END LOOP;
  END IF;

  IF COALESCE(array_length(v_reply_recipients, 1), 0) > 0 THEN
    INSERT INTO comment_notifications (user_id, type, comment_id, ticket_id)
    SELECT recipient_id, 'reply'::comment_notification_type, v_comment.id, p_ticket_id
    FROM unnest(v_reply_recipients) AS recipient_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_notification_count := v_notification_count + v_rows;
  END IF;

  IF COALESCE(array_length(v_unique_mentions, 1), 0) > 0 THEN
    INSERT INTO comment_notifications (user_id, type, comment_id, ticket_id)
    SELECT mention_id, 'mention'::comment_notification_type, v_comment.id, p_ticket_id
    FROM unnest(v_unique_mentions) AS mention_id
    WHERE mention_id <> p_author_id
      AND NOT (mention_id = ANY(v_reply_recipients));

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_notification_count := v_notification_count + v_rows;
  END IF;

  comment_id := v_comment.id;
  ticket_id := v_comment.ticket_id;
  parent_id := v_comment.parent_id;
  author_id := v_comment.author_id;
  body := v_comment.body;
  created_at := v_comment.created_at;
  updated_at := v_comment.updated_at;
  mention_user_ids := v_unique_mentions;
  notification_count := v_notification_count;

  RETURN NEXT;
END;
$$;
