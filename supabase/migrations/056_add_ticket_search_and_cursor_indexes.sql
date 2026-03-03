-- Indexes for cursor pagination and search-heavy ticket views.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_tickets_parent_subtask_created
  ON tickets(parent_ticket_id, created_at DESC)
  WHERE type = 'subtask';

CREATE INDEX IF NOT EXISTS idx_tickets_created_id_desc
  ON tickets(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_title_trgm
  ON tickets USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tickets_display_id_trgm
  ON tickets USING GIN (display_id gin_trgm_ops);
