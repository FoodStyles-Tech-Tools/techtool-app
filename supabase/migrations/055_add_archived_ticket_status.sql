-- Add archived status for soft-deleted tickets

INSERT INTO ticket_statuses (key, label, sort_order, color)
VALUES ('archived', 'Archived', 100, '#6b7280')
ON CONFLICT (key) DO NOTHING;

