-- Add SQA assignee fields to tickets
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS sqa_assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sqa_assigned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_tickets_sqa_assignee_id ON tickets(sqa_assignee_id);
