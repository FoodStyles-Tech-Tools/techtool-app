-- Ticket activity feed (Jira-like timeline support)
CREATE TABLE IF NOT EXISTS ticket_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_activity_ticket_created
  ON ticket_activity(ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_activity_event_type
  ON ticket_activity(event_type);

ALTER TABLE ticket_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ticket activity" ON ticket_activity;
CREATE POLICY "Users can view ticket activity"
  ON ticket_activity FOR SELECT
  USING (
    user_has_permission('tickets'::permission_resource, 'view'::permission_action)
    AND EXISTS (
      SELECT 1 FROM tickets WHERE tickets.id = ticket_activity.ticket_id
    )
  );

DROP POLICY IF EXISTS "Users can insert ticket activity" ON ticket_activity;
CREATE POLICY "Users can insert ticket activity"
  ON ticket_activity FOR INSERT
  WITH CHECK (
    (
      user_has_permission('tickets'::permission_resource, 'create'::permission_action)
      OR user_has_permission('tickets'::permission_resource, 'edit'::permission_action)
    )
    AND EXISTS (
      SELECT 1 FROM tickets WHERE tickets.id = ticket_activity.ticket_id
    )
  );

CREATE OR REPLACE FUNCTION log_ticket_activity_for_tickets()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ticket_activity (
      ticket_id,
      actor_id,
      event_type,
      metadata
    )
    VALUES (
      NEW.id,
      current_user_id(),
      'ticket_created',
      jsonb_build_object(
        'title', NEW.title,
        'status', NEW.status,
        'display_id', NEW.display_id
      )
    );
    RETURN NEW;
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'title', to_jsonb(OLD.title), to_jsonb(NEW.title));
  END IF;

  IF NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'description', to_jsonb(OLD.description), to_jsonb(NEW.description));
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'status', to_jsonb(OLD.status), to_jsonb(NEW.status));
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'priority', to_jsonb(OLD.priority), to_jsonb(NEW.priority));
  END IF;

  IF NEW.type IS DISTINCT FROM OLD.type THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'type', to_jsonb(OLD.type), to_jsonb(NEW.type));
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'due_date', to_jsonb(OLD.due_date), to_jsonb(NEW.due_date));
  END IF;

  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'assignee_id', to_jsonb(OLD.assignee_id), to_jsonb(NEW.assignee_id));
  END IF;

  IF NEW.sqa_assignee_id IS DISTINCT FROM OLD.sqa_assignee_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'sqa_assignee_id', to_jsonb(OLD.sqa_assignee_id), to_jsonb(NEW.sqa_assignee_id));
  END IF;

  IF NEW.requested_by_id IS DISTINCT FROM OLD.requested_by_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'requested_by_id', to_jsonb(OLD.requested_by_id), to_jsonb(NEW.requested_by_id));
  END IF;

  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'department_id', to_jsonb(OLD.department_id), to_jsonb(NEW.department_id));
  END IF;

  IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'project_id', to_jsonb(OLD.project_id), to_jsonb(NEW.project_id));
  END IF;

  IF NEW.epic_id IS DISTINCT FROM OLD.epic_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'epic_id', to_jsonb(OLD.epic_id), to_jsonb(NEW.epic_id));
  END IF;

  IF NEW.sprint_id IS DISTINCT FROM OLD.sprint_id THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'sprint_id', to_jsonb(OLD.sprint_id), to_jsonb(NEW.sprint_id));
  END IF;

  IF NEW.assigned_at IS DISTINCT FROM OLD.assigned_at THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'assigned_at', to_jsonb(OLD.assigned_at), to_jsonb(NEW.assigned_at));
  END IF;

  IF NEW.sqa_assigned_at IS DISTINCT FROM OLD.sqa_assigned_at THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'sqa_assigned_at', to_jsonb(OLD.sqa_assigned_at), to_jsonb(NEW.sqa_assigned_at));
  END IF;

  IF NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'started_at', to_jsonb(OLD.started_at), to_jsonb(NEW.started_at));
  END IF;

  IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'completed_at', to_jsonb(OLD.completed_at), to_jsonb(NEW.completed_at));
  END IF;

  IF NEW.links IS DISTINCT FROM OLD.links THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'links', to_jsonb(OLD.links), to_jsonb(NEW.links));
  END IF;

  IF NEW.reason IS DISTINCT FROM OLD.reason THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, field_name, old_value, new_value)
    VALUES (NEW.id, current_user_id(), 'ticket_field_changed', 'reason', to_jsonb(OLD.reason), to_jsonb(NEW.reason));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_activity ON tickets;
CREATE TRIGGER trg_tickets_activity
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_activity_for_tickets();

CREATE OR REPLACE FUNCTION log_ticket_activity_for_subtasks()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, metadata)
    VALUES (
      NEW.ticket_id,
      current_user_id(),
      'subtask_added',
      jsonb_build_object(
        'subtask_id', NEW.id,
        'title', NEW.title
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.title IS DISTINCT FROM OLD.title THEN
      INSERT INTO ticket_activity (ticket_id, actor_id, event_type, old_value, new_value, metadata)
      VALUES (
        NEW.ticket_id,
        current_user_id(),
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
        current_user_id(),
        CASE WHEN NEW.completed THEN 'subtask_completed' ELSE 'subtask_reopened' END,
        jsonb_build_object(
          'subtask_id', NEW.id,
          'title', NEW.title
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  INSERT INTO ticket_activity (ticket_id, actor_id, event_type, metadata)
  VALUES (
    OLD.ticket_id,
    current_user_id(),
    'subtask_deleted',
    jsonb_build_object(
      'subtask_id', OLD.id,
      'title', OLD.title
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subtasks_activity ON subtasks;
CREATE TRIGGER trg_subtasks_activity
  AFTER INSERT OR UPDATE OR DELETE ON subtasks
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_activity_for_subtasks();

CREATE OR REPLACE FUNCTION log_ticket_activity_for_comments()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ticket_activity (ticket_id, actor_id, event_type, metadata)
    VALUES (
      NEW.ticket_id,
      NEW.author_id,
      'comment_added',
      jsonb_build_object(
        'comment_id', NEW.id,
        'parent_id', NEW.parent_id,
        'body', left(NEW.body, 240)
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.body IS DISTINCT FROM OLD.body THEN
      INSERT INTO ticket_activity (ticket_id, actor_id, event_type, old_value, new_value, metadata)
      VALUES (
        NEW.ticket_id,
        NEW.author_id,
        'comment_edited',
        to_jsonb(OLD.body),
        to_jsonb(NEW.body),
        jsonb_build_object(
          'comment_id', NEW.id,
          'parent_id', NEW.parent_id
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  INSERT INTO ticket_activity (ticket_id, actor_id, event_type, old_value, metadata)
  VALUES (
    OLD.ticket_id,
    OLD.author_id,
    'comment_deleted',
    to_jsonb(OLD.body),
    jsonb_build_object(
      'comment_id', OLD.id,
      'parent_id', OLD.parent_id
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ticket_comments_activity ON ticket_comments;
CREATE TRIGGER trg_ticket_comments_activity
  AFTER INSERT OR UPDATE OR DELETE ON ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_activity_for_comments();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'ticket_activity'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ticket_activity;
  END IF;
END;
$$;
