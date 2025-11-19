-- Add ticket_type enum
CREATE TYPE ticket_type AS ENUM ('bug', 'request', 'task');

-- Add type column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS type ticket_type DEFAULT 'task';

-- Create index on type for faster filtering
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);


