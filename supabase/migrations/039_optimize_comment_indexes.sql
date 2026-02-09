-- Optimize comment queries with composite indexes
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_created ON ticket_comments(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_parent_created ON ticket_comments(parent_id, created_at) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comment_notifications_user_ticket ON comment_notifications(user_id, ticket_id, created_at DESC);
