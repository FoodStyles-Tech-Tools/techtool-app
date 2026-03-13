-- Unified audit log with module and resource_type for all user actions.
-- Replaces ticket_activity as the single source for activity/audit; existing
-- ticket_activity data is migrated here and triggers are switched to write here.

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  module TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_ticket_created
  ON audit_log(ticket_id, created_at DESC)
  WHERE ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_module_created
  ON audit_log(module, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource
  ON audit_log(resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_type
  ON audit_log(event_type);

COMMENT ON COLUMN audit_log.module IS 'Product area: tickets, projects, planning, assets, reports, users, etc.';
COMMENT ON COLUMN audit_log.resource_type IS 'Entity type: ticket, subtask, comment, project, epic, sprint, asset, etc.';
COMMENT ON COLUMN audit_log.resource_id IS 'ID of the entity that was changed (ticket id, subtask id, comment id, etc.).';
COMMENT ON COLUMN audit_log.ticket_id IS 'For ticket-module events: the ticket whose activity feed this row belongs to (parent ticket for subtask/comment).';

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view audit log" ON audit_log;
CREATE POLICY "Users can view audit log"
  ON audit_log FOR SELECT
  USING (
    user_has_permission('tickets'::permission_resource, 'view'::permission_action)
    AND (
      ticket_id IS NULL
      OR EXISTS (SELECT 1 FROM tickets WHERE tickets.id = audit_log.ticket_id)
    )
  );

DROP POLICY IF EXISTS "Users can insert audit log" ON audit_log;
CREATE POLICY "Users can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (
    (
      user_has_permission('tickets'::permission_resource, 'create'::permission_action)
      OR user_has_permission('tickets'::permission_resource, 'edit'::permission_action)
    )
    AND (ticket_id IS NULL OR EXISTS (SELECT 1 FROM tickets WHERE tickets.id = audit_log.ticket_id))
  );

-- Migrate existing ticket_activity into audit_log with module and resource_type
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
  ta.actor_id,
  'tickets'::TEXT,
  CASE
    WHEN ta.event_type IN ('ticket_created', 'ticket_field_changed') THEN 'ticket'::TEXT
    WHEN ta.event_type LIKE 'subtask_%' THEN 'subtask'::TEXT
    WHEN ta.event_type LIKE 'comment_%' THEN 'comment'::TEXT
    ELSE 'ticket'::TEXT
  END,
  COALESCE(
    CASE WHEN ta.metadata->>'subtask_id' ~* '^[0-9a-f-]{36}$' THEN (ta.metadata->>'subtask_id')::uuid ELSE NULL END,
    CASE WHEN ta.metadata->>'comment_id' ~* '^[0-9a-f-]{36}$' THEN (ta.metadata->>'comment_id')::uuid ELSE NULL END,
    ta.ticket_id
  ),
  ta.ticket_id,
  ta.event_type,
  ta.field_name,
  ta.old_value,
  ta.new_value,
  COALESCE(ta.metadata, '{}'::jsonb),
  ta.created_at
FROM ticket_activity ta;

-- Triggers that write to audit_log (tickets)
CREATE OR REPLACE FUNCTION log_audit_for_tickets()
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
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
    VALUES (
      actor_uuid,
      'tickets',
      'ticket',
      NEW.id,
      NEW.id,
      'ticket_created',
      jsonb_build_object('title', NEW.title, 'status', NEW.status, 'display_id', NEW.display_id)
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
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'title', to_jsonb(OLD.title), to_jsonb(NEW.title));
  END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'description', to_jsonb(OLD.description), to_jsonb(NEW.description));
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'status', to_jsonb(OLD.status), to_jsonb(NEW.status));
  END IF;
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'priority', to_jsonb(OLD.priority), to_jsonb(NEW.priority));
  END IF;
  IF NEW.type IS DISTINCT FROM OLD.type THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'type', to_jsonb(OLD.type), to_jsonb(NEW.type));
  END IF;
  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'due_date', to_jsonb(OLD.due_date), to_jsonb(NEW.due_date));
  END IF;
  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'assignee_id', to_jsonb(OLD.assignee_id), to_jsonb(NEW.assignee_id));
  END IF;
  IF NEW.sqa_assignee_id IS DISTINCT FROM OLD.sqa_assignee_id THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'sqa_assignee_id', to_jsonb(OLD.sqa_assignee_id), to_jsonb(NEW.sqa_assignee_id));
  END IF;
  IF NEW.requested_by_id IS DISTINCT FROM OLD.requested_by_id THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'requested_by_id', to_jsonb(OLD.requested_by_id), to_jsonb(NEW.requested_by_id));
  END IF;
  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'department_id', to_jsonb(OLD.department_id), to_jsonb(NEW.department_id));
  END IF;
  IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'project_id', to_jsonb(OLD.project_id), to_jsonb(NEW.project_id));
  END IF;
  IF NEW.epic_id IS DISTINCT FROM OLD.epic_id THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'epic_id', to_jsonb(OLD.epic_id), to_jsonb(NEW.epic_id));
  END IF;
  IF NEW.sprint_id IS DISTINCT FROM OLD.sprint_id THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'sprint_id', to_jsonb(OLD.sprint_id), to_jsonb(NEW.sprint_id));
  END IF;
  IF NEW.assigned_at IS DISTINCT FROM OLD.assigned_at THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'assigned_at', to_jsonb(OLD.assigned_at), to_jsonb(NEW.assigned_at));
  END IF;
  IF NEW.sqa_assigned_at IS DISTINCT FROM OLD.sqa_assigned_at THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'sqa_assigned_at', to_jsonb(OLD.sqa_assigned_at), to_jsonb(NEW.sqa_assigned_at));
  END IF;
  IF NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'started_at', to_jsonb(OLD.started_at), to_jsonb(NEW.started_at));
  END IF;
  IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'completed_at', to_jsonb(OLD.completed_at), to_jsonb(NEW.completed_at));
  END IF;
  IF NEW.links IS DISTINCT FROM OLD.links THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'links', to_jsonb(OLD.links), to_jsonb(NEW.links));
  END IF;
  IF NEW.reason IS DISTINCT FROM OLD.reason THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
    VALUES (actor_uuid, 'tickets', 'ticket', NEW.id, NEW.id, 'ticket_field_changed', 'reason', to_jsonb(OLD.reason), to_jsonb(NEW.reason));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers that write to audit_log (subtasks)
CREATE OR REPLACE FUNCTION log_audit_for_subtasks()
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
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
    VALUES (
      actor_uuid,
      'tickets',
      'subtask',
      NEW.id,
      NEW.ticket_id,
      'subtask_added',
      jsonb_build_object('subtask_id', NEW.id, 'title', NEW.title)
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
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, old_value, new_value, metadata)
      VALUES (
        actor_uuid,
        'tickets',
        'subtask',
        NEW.id,
        NEW.ticket_id,
        'subtask_renamed',
        to_jsonb(OLD.title),
        to_jsonb(NEW.title),
        jsonb_build_object('subtask_id', NEW.id)
      );
    END IF;
    IF NEW.completed IS DISTINCT FROM OLD.completed THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
      VALUES (
        actor_uuid,
        'tickets',
        'subtask',
        NEW.id,
        NEW.ticket_id,
        CASE WHEN NEW.completed THEN 'subtask_completed' ELSE 'subtask_reopened' END,
        jsonb_build_object('subtask_id', NEW.id, 'title', NEW.title)
      );
    END IF;
    RETURN NEW;
  END IF;

  actor_uuid := COALESCE(
    OLD.activity_actor_id,
    current_user_id(),
    (SELECT requested_by_id FROM tickets WHERE id = OLD.ticket_id)
  );
  INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
  VALUES (
    actor_uuid,
    'tickets',
    'subtask',
    OLD.id,
    OLD.ticket_id,
    'subtask_deleted',
    jsonb_build_object('subtask_id', OLD.id, 'title', OLD.title)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Triggers that write to audit_log (comments)
CREATE OR REPLACE FUNCTION log_audit_for_comments()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
    VALUES (
      NEW.author_id,
      'tickets',
      'comment',
      NEW.id,
      NEW.ticket_id,
      'comment_added',
      jsonb_build_object('comment_id', NEW.id, 'parent_id', NEW.parent_id, 'body', left(NEW.body, 240))
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.body IS DISTINCT FROM OLD.body THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, old_value, new_value, metadata)
      VALUES (
        NEW.author_id,
        'tickets',
        'comment',
        NEW.id,
        NEW.ticket_id,
        'comment_edited',
        to_jsonb(OLD.body),
        to_jsonb(NEW.body),
        jsonb_build_object('comment_id', NEW.id, 'parent_id', NEW.parent_id)
      );
    END IF;
    RETURN NEW;
  END IF;

  INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, old_value, metadata)
  VALUES (
    OLD.author_id,
    'tickets',
    'comment',
    OLD.id,
    OLD.ticket_id,
    'comment_deleted',
    to_jsonb(OLD.body),
    jsonb_build_object('comment_id', OLD.id, 'parent_id', OLD.parent_id)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop old triggers that wrote to ticket_activity; attach new ones that write to audit_log
DROP TRIGGER IF EXISTS trg_tickets_activity ON tickets;
CREATE TRIGGER trg_tickets_activity
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_for_tickets();

-- Only attach subtasks trigger if the subtasks table exists (e.g. migration 012 applied)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subtasks') THEN
    DROP TRIGGER IF EXISTS trg_subtasks_activity ON subtasks;
    CREATE TRIGGER trg_subtasks_activity
      AFTER INSERT OR UPDATE OR DELETE ON subtasks
      FOR EACH ROW
      EXECUTE FUNCTION log_audit_for_subtasks();
  END IF;
END;
$$;

-- Only attach comments trigger if the ticket_comments table exists (e.g. migration 038 applied)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_comments') THEN
    DROP TRIGGER IF EXISTS trg_ticket_comments_activity ON ticket_comments;
    CREATE TRIGGER trg_ticket_comments_activity
      AFTER INSERT OR UPDATE OR DELETE ON ticket_comments
      FOR EACH ROW
      EXECUTE FUNCTION log_audit_for_comments();
  END IF;
END;
$$;

-- Realtime: so ticket activity feed can invalidate on new rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'audit_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;
  END IF;
END;
$$;
