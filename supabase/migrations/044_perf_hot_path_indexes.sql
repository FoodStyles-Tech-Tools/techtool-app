-- Additional hot-path indexes for ticket lists, comments, and notification unread counters.

-- Ticket list default ordering and compound filters
CREATE INDEX IF NOT EXISTS idx_tickets_created_desc
  ON tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_project_status_assignee_created
  ON tickets(project_id, status, assignee_id, created_at DESC)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_assignee_status_created
  ON tickets(assignee_id, status, created_at DESC)
  WHERE assignee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_requested_status_created
  ON tickets(requested_by_id, status, created_at DESC);

-- Comment tree loading and merge operations
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_parent_created
  ON ticket_comments(ticket_id, parent_id, created_at ASC);

-- Notification unread counters and list rendering
CREATE INDEX IF NOT EXISTS idx_comment_notifications_user_read_created
  ON comment_notifications(user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_notifications_user_unread_created
  ON comment_notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;
