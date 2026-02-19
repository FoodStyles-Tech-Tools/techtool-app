-- Fix ticket activity actor resolution so activity entries don't fall back to "System".
-- We cannot rely only on current_user_id() because many writes come from app sessions
-- that don't carry a Supabase JWT into DB triggers.

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS activity_actor_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE subtasks
  ADD COLUMN IF NOT EXISTS activity_actor_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION log_ticket_activity_for_tickets()
RETURNS trigger AS $$
DECLARE
  actor_uuid UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    actor_uuid := COALESCE(
      NEW.activity_actor_id,
      current_user_id(),
      NEW.requested_by_id,
      NEW.assignee_id,
      NEW.sqa_assignee_id
    );

    INSERT INTO ticket_activity (
      ticket_id,
      actor_id,
      event_type,
      metadata
    )
    VALUES (
      NEW.id,
      actor_uuid,
      'ticket_created',
      jsonb_build_object(
        'title', NEW.title,
        'status', NEW.status,
        'display_id', NEW.display_id
      )
    );
    RETURN NEW;
  END IF;

  actor_uuid := COALESCE(
    NEW.activity_actor_id,
    current_user_id(),
    NEW.requested_by_id,
    OLD.requested_by_id,
    NEW.assignee_id,
    OLD.assignee_id,
    NEW.sqa_assignee_id,
    OLD.sqa_assignee_id
  );

  IF NEW.title IS DISTINCT FROM OLD.title THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'title', to_jsonb(OLD.title), to_jsonb(NEW.title));
  END IF;

  IF NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'description', to_jsonb(OLD.description), to_jsonb(NEW.description));
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'status', to_jsonb(OLD.status), to_jsonb(NEW.status));
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'priority', to_jsonb(OLD.priority), to_jsonb(NEW.priority));
  END IF;

  IF NEW.type IS DISTINCT FROM OLD.type THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'type', to_jsonb(OLD.type), to_jsonb(NEW.type));
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'due_date', to_jsonb(OLD.due_date), to_jsonb(NEW.due_date));
  END IF;

  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'assignee_id', to_jsonb(OLD.assignee_id), to_jsonb(NEW.assignee_id));
  END IF;

  IF NEW.sqa_assignee_id IS DISTINCT FROM OLD.sqa_assignee_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'sqa_assignee_id', to_jsonb(OLD.sqa_assignee_id), to_jsonb(NEW.sqa_assignee_id));
  END IF;

  IF NEW.requested_by_id IS DISTINCT FROM OLD.requested_by_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'requested_by_id', to_jsonb(OLD.requested_by_id), to_jsonb(NEW.requested_by_id));
  END IF;

  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'department_id', to_jsonb(OLD.department_id), to_jsonb(NEW.department_id));
  END IF;

  IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'project_id', to_jsonb(OLD.project_id), to_jsonb(NEW.project_id));
  END IF;

  IF NEW.epic_id IS DISTINCT FROM OLD.epic_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'epic_id', to_jsonb(OLD.epic_id), to_jsonb(NEW.epic_id));
  END IF;

  IF NEW.sprint_id IS DISTINCT FROM OLD.sprint_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'sprint_id', to_jsonb(OLD.sprint_id), to_jsonb(NEW.sprint_id));
  END IF;

  IF NEW.assigned_at IS DISTINCT FROM OLD.assigned_at THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'assigned_at', to_jsonb(OLD.assigned_at), to_jsonb(NEW.assigned_at));
  END IF;

  IF NEW.sqa_assigned_at IS DISTINCT FROM OLD.sqa_assigned_at THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'sqa_assigned_at', to_jsonb(OLD.sqa_assigned_at), to_jsonb(NEW.sqa_assigned_at));
  END IF;

  IF NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'started_at', to_jsonb(OLD.started_at), to_jsonb(NEW.started_at));
  END IF;

  IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'completed_at', to_jsonb(OLD.completed_at), to_jsonb(NEW.completed_at));
  END IF;

  IF NEW.links IS DISTINCT FROM OLD.links THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'links', to_jsonb(OLD.links), to_jsonb(NEW.links));
  END IF;

  IF NEW.reason IS DISTINCT FROM OLD.reason THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, actor_uuid, 'ticket_field_changed', 'reason', to_jsonb(OLD.reason), to_jsonb(NEW.reason));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_ticket_activity_for_subtasks()
RETURNS trigger AS $$
DECLARE
  actor_uuid UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    actor_uuid := COALESCE(
      NEW.activity_actor_id,
      current_user_id(),
      (SELECT requested_by_id FROM tickets WHERE id = NEW.ticket_id)
    );

    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, metadata)
    VALUES (
      NEW.ticket_id,
      actor_uuid,
      'subtask_added',
      jsonb_build_object(
        'subtask_id', NEW.id,
        'title', NEW.title
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    actor_uuid := COALESCE(
      NEW.activity_actor_id,
      current_user_id(),
      OLD.activity_actor_id,
      (SELECT requested_by_id FROM tickets WHERE id = NEW.ticket_id)
    );

    IF NEW.title IS DISTINCT FROM OLD.title THEN
      INSERT INTO ticket_activity (ticket_id, actor_id, event_type, old_value, new_value, metadata)
      VALUES (
        NEW.ticket_id,
        actor_uuid,
        'subtask_renamed',
        to_jsonb(OLD.title),
        to_jsonb(NEW.title),
        jsonb_build_object('subtask_id', NEW.id)
      );
    END IF;

    IF NEW.completed IS DISTINCT FROM OLD.completed THEN
      INSERT INTO ticket_activity (ticket_id, actor_id, event_type, metadata)
      VALUES (
        NEW.ticket_id,
        actor_uuid,
        CASE WHEN NEW.completed THEN 'subtask_completed' ELSE 'subtask_reopened' END,
        jsonb_build_object(
          'subtask_id', NEW.id,
          'title', NEW.title
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  actor_uuid := COALESCE(
    OLD.activity_actor_id,
    current_user_id(),
    (SELECT requested_by_id FROM tickets WHERE id = OLD.ticket_id)
  );

  INSERT INTO ticket_activity (ticket_id, actor_id, event_type, metadata)
  VALUES (
    OLD.ticket_id,
    actor_uuid,
    'subtask_deleted',
    jsonb_build_object(
      'subtask_id', OLD.id,
      'title', OLD.title
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing NULL actors so old rows stop showing as "System" when possible.
WITH resolved_actor AS (
  SELECT
    ta.id,
    COALESCE(
      CASE WHEN ta.event_type LIKE 'comment_%' THEN tc.author_id ELSE NULL END,
      CASE WHEN ta.event_type LIKE 'subtask_%' THEN s.activity_actor_id ELSE NULL END,
      t.activity_actor_id,
      t.requested_by_id,
      t.assignee_id,
      t.sqa_assignee_id
    ) AS actor_id
  FROM ticket_activity ta
  JOIN tickets t ON t.id = ta.ticket_id
  LEFT JOIN ticket_comments tc
    ON tc.id = CASE
      WHEN (ta.metadata->>'comment_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (ta.metadata->>'comment_id')::uuid
      ELSE NULL
    END
  LEFT JOIN subtasks s
    ON s.id = CASE
      WHEN (ta.metadata->>'subtask_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (ta.metadata->>'subtask_id')::uuid
      ELSE NULL
    END
  WHERE ta.actor_id IS NULL
)
UPDATE ticket_activity ta
SET actor_id = ra.actor_id
FROM resolved_actor ra
WHERE ta.id = ra.id
  AND ra.actor_id IS NOT NULL;
