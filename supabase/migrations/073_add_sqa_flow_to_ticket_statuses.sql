-- Add per-status SQA flow configuration (replaces key-based hardcoding).
ALTER TABLE ticket_statuses
ADD COLUMN IF NOT EXISTS sqa_flow BOOLEAN NOT NULL DEFAULT FALSE;

-- Preserve previous behavior for known SQA-only statuses.
UPDATE ticket_statuses
SET sqa_flow = TRUE
WHERE key IN ('returned_to_dev', 'for_qa', 'qa_pass');
