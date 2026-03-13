-- Backfill audit_log with ticket lifecycle timestamps from public.tickets.
-- For tickets that have created_at, assigned_at, started_at, completed_at, or
-- sqa_assigned_at set but no existing audit row for that field (e.g. data from
-- before activity logging or bulk updates), insert a synthetic audit row so
-- the timeline shows when the value was set. created_at on the audit row is set
-- to the ticket's timestamp so entries sort correctly in history.

INSERT INTO audit_log (
  actor_id,
  module,
  resource_type,
  resource_id,
  ticket_id,
  event_type,
  field_name,
  old_value,
  new_value,
  metadata,
  created_at
)
SELECT
  NULL,
  'tickets',
  'ticket',
  t.id,
  t.id,
  'ticket_field_changed',
  'created_at',
  NULL,
  to_jsonb(t.created_at::timestamptz),
  '{}'::jsonb,
  t.created_at
FROM tickets t
WHERE t.created_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log al
    WHERE al.ticket_id = t.id
      AND al.field_name = 'created_at'
      AND al.event_type = 'ticket_field_changed'
  );

INSERT INTO audit_log (
  actor_id,
  module,
  resource_type,
  resource_id,
  ticket_id,
  event_type,
  field_name,
  old_value,
  new_value,
  metadata,
  created_at
)
SELECT
  NULL,
  'tickets',
  'ticket',
  t.id,
  t.id,
  'ticket_field_changed',
  'assigned_at',
  NULL,
  to_jsonb(t.assigned_at::timestamptz),
  '{}'::jsonb,
  t.assigned_at
FROM tickets t
WHERE t.assigned_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log al
    WHERE al.ticket_id = t.id
      AND al.field_name = 'assigned_at'
      AND al.event_type = 'ticket_field_changed'
  );

INSERT INTO audit_log (
  actor_id,
  module,
  resource_type,
  resource_id,
  ticket_id,
  event_type,
  field_name,
  old_value,
  new_value,
  metadata,
  created_at
)
SELECT
  NULL,
  'tickets',
  'ticket',
  t.id,
  t.id,
  'ticket_field_changed',
  'started_at',
  NULL,
  to_jsonb(t.started_at::timestamptz),
  '{}'::jsonb,
  t.started_at
FROM tickets t
WHERE t.started_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log al
    WHERE al.ticket_id = t.id
      AND al.field_name = 'started_at'
      AND al.event_type = 'ticket_field_changed'
  );

INSERT INTO audit_log (
  actor_id,
  module,
  resource_type,
  resource_id,
  ticket_id,
  event_type,
  field_name,
  old_value,
  new_value,
  metadata,
  created_at
)
SELECT
  NULL,
  'tickets',
  'ticket',
  t.id,
  t.id,
  'ticket_field_changed',
  'completed_at',
  NULL,
  to_jsonb(t.completed_at::timestamptz),
  '{}'::jsonb,
  t.completed_at
FROM tickets t
WHERE t.completed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log al
    WHERE al.ticket_id = t.id
      AND al.field_name = 'completed_at'
      AND al.event_type = 'ticket_field_changed'
  );

INSERT INTO audit_log (
  actor_id,
  module,
  resource_type,
  resource_id,
  ticket_id,
  event_type,
  field_name,
  old_value,
  new_value,
  metadata,
  created_at
)
SELECT
  NULL,
  'tickets',
  'ticket',
  t.id,
  t.id,
  'ticket_field_changed',
  'sqa_assigned_at',
  NULL,
  to_jsonb(t.sqa_assigned_at::timestamptz),
  '{}'::jsonb,
  t.sqa_assigned_at
FROM tickets t
WHERE t.sqa_assigned_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log al
    WHERE al.ticket_id = t.id
      AND al.field_name = 'sqa_assigned_at'
      AND al.event_type = 'ticket_field_changed'
  );
