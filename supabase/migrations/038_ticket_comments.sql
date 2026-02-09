-- Ticket comments (with threaded replies)
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES ticket_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_parent_id ON ticket_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_author_id ON ticket_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON ticket_comments(created_at);

-- Comment mentions (who was @mentioned in a comment)
CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES ticket_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment_id ON comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user_id ON comment_mentions(user_id);

-- Notifications for replies and mentions (with read tracking)
DO $$ BEGIN
  CREATE TYPE comment_notification_type AS ENUM ('reply', 'mention');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS comment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type comment_notification_type NOT NULL,
  comment_id UUID NOT NULL REFERENCES ticket_comments(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_comment_notifications_user_id ON comment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_read_at ON comment_notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_created_at ON comment_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_notifications_user_unread ON comment_notifications(user_id) WHERE read_at IS NULL;

-- Trigger for comment updated_at
CREATE TRIGGER update_ticket_comments_updated_at
  BEFORE UPDATE ON ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_notifications ENABLE ROW LEVEL SECURITY;

-- ticket_comments: view if can view ticket; create/update/delete if can edit ticket (and own for update/delete)
CREATE POLICY "Users can view ticket comments"
  ON ticket_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND user_has_permission('tickets'::permission_resource, 'view'::permission_action)
    )
  );

CREATE POLICY "Users can create ticket comments"
  ON ticket_comments FOR INSERT
  WITH CHECK (
    user_has_permission('tickets'::permission_resource, 'edit'::permission_action)
    AND author_id = current_user_id()
    AND EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND user_has_permission('tickets'::permission_resource, 'view'::permission_action)
    )
  );

CREATE POLICY "Users can update own ticket comments"
  ON ticket_comments FOR UPDATE
  USING (author_id = current_user_id());

CREATE POLICY "Users can delete own ticket comments"
  ON ticket_comments FOR DELETE
  USING (author_id = current_user_id());

-- comment_mentions: view with comment; insert with comment (handled via app when creating comment)
CREATE POLICY "Users can view comment mentions"
  ON comment_mentions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ticket_comments c
      JOIN tickets t ON t.id = c.ticket_id
      WHERE c.id = comment_mentions.comment_id
      AND user_has_permission('tickets'::permission_resource, 'view'::permission_action)
    )
  );

CREATE POLICY "Users can create comment mentions"
  ON comment_mentions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ticket_comments c
      WHERE c.id = comment_mentions.comment_id
      AND c.author_id = current_user_id()
    )
  );

-- comment_notifications: users see only their own; can update read_at on own
CREATE POLICY "Users can view own comment notifications"
  ON comment_notifications FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "Users can update own comment notifications read_at"
  ON comment_notifications FOR UPDATE
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- Only the comment author can create notifications (when they post a comment/reply or mention someone)
CREATE POLICY "Users can create comment notifications"
  ON comment_notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ticket_comments c
      WHERE c.id = comment_notifications.comment_id
      AND c.author_id = current_user_id()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE comment_notifications;
