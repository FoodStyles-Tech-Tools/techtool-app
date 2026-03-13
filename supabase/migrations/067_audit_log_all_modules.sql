-- Audit log: insert from all modules (projects, epics, sprints, assets, users, roles).
-- Expands RLS so any module with view permission can read its audit_log rows.

-- =============================================================================
-- 1. RLS: Allow SELECT by module permission
-- =============================================================================
DROP POLICY IF EXISTS "Users can view audit log" ON audit_log;
CREATE POLICY "Users can view audit log"
  ON audit_log FOR SELECT
  USING (
    -- Tickets module (existing): ticket_id set, require tickets view
    (
      user_has_permission('tickets'::permission_resource, 'view'::permission_action)
      AND (ticket_id IS NOT NULL AND EXISTS (SELECT 1 FROM tickets t WHERE t.id = audit_log.ticket_id))
    )
    OR
    -- Projects / planning: projects view
    (
      user_has_permission('projects'::permission_resource, 'view'::permission_action)
      AND audit_log.module IN ('projects', 'epics', 'sprints')
    )
    OR
    -- Assets
    (
      user_has_permission('assets'::permission_resource, 'view'::permission_action)
      AND audit_log.module = 'assets'
    )
    OR
    -- Users: view or manage
    (
      (user_has_permission('users'::permission_resource, 'view'::permission_action)
       OR user_has_permission('users'::permission_resource, 'manage'::permission_action))
      AND audit_log.module = 'users'
    )
    OR
    -- Roles
    (
      user_has_permission('roles'::permission_resource, 'view'::permission_action)
      AND audit_log.module = 'roles'
    )
  );

-- =============================================================================
-- 2. RLS: Allow INSERT from triggers (any module where user can create/edit/manage)
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert audit log" ON audit_log;
CREATE POLICY "Users can insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (
    -- Tickets
    (
      (user_has_permission('tickets'::permission_resource, 'create'::permission_action)
       OR user_has_permission('tickets'::permission_resource, 'edit'::permission_action))
      AND (ticket_id IS NULL OR EXISTS (SELECT 1 FROM tickets t WHERE t.id = audit_log.ticket_id))
    )
    OR
    -- Projects / epics / sprints
    (
      (user_has_permission('projects'::permission_resource, 'create'::permission_action)
       OR user_has_permission('projects'::permission_resource, 'edit'::permission_action)
       OR user_has_permission('projects'::permission_resource, 'manage'::permission_action))
      AND audit_log.module IN ('projects', 'epics', 'sprints')
    )
    OR
    -- Assets
    (
      (user_has_permission('assets'::permission_resource, 'create'::permission_action)
       OR user_has_permission('assets'::permission_resource, 'edit'::permission_action)
       OR user_has_permission('assets'::permission_resource, 'manage'::permission_action))
      AND audit_log.module = 'assets'
    )
    OR
    -- Users
    (
      user_has_permission('users'::permission_resource, 'manage'::permission_action)
      AND audit_log.module = 'users'
    )
    OR
    -- Roles
    (
      user_has_permission('roles'::permission_resource, 'manage'::permission_action)
      AND audit_log.module = 'roles'
    )
  );

-- =============================================================================
-- 3. Trigger functions: projects
-- =============================================================================
CREATE OR REPLACE FUNCTION log_audit_for_projects()
RETURNS trigger AS $$
DECLARE
  actor_uuid UUID := current_user_id();
BEGIN
  IF actor_uuid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
    VALUES (
      actor_uuid,
      'projects',
      'project',
      NEW.id,
      NULL,
      'project_created',
      jsonb_build_object('name', NEW.name, 'status', NEW.status)
    );
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'projects', 'project', NEW.id, NULL, 'project_updated', 'name', to_jsonb(OLD.name), to_jsonb(NEW.name));
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'projects', 'project', NEW.id, NULL, 'project_updated', 'description', to_jsonb(OLD.description), to_jsonb(NEW.description));
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'projects', 'project', NEW.id, NULL, 'project_updated', 'status', to_jsonb(OLD.status), to_jsonb(NEW.status));
    END IF;
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'projects', 'project', NEW.id, NULL, 'project_updated', 'owner_id', to_jsonb(OLD.owner_id), to_jsonb(NEW.owner_id));
    END IF;
    RETURN NEW;
  END IF;
  -- DELETE
  INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
  VALUES (actor_uuid, 'projects', 'project', OLD.id, NULL, 'project_deleted', jsonb_build_object('name', OLD.name));
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. Trigger functions: epics
-- =============================================================================
CREATE OR REPLACE FUNCTION log_audit_for_epics()
RETURNS trigger AS $$
DECLARE
  actor_uuid UUID := current_user_id();
BEGIN
  IF actor_uuid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
    VALUES (actor_uuid, 'epics', 'epic', NEW.id, NULL, 'epic_created', jsonb_build_object('name', NEW.name, 'color', NEW.color));
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'epics', 'epic', NEW.id, NULL, 'epic_updated', 'name', to_jsonb(OLD.name), to_jsonb(NEW.name));
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'epics', 'epic', NEW.id, NULL, 'epic_updated', 'description', to_jsonb(OLD.description), to_jsonb(NEW.description));
    END IF;
    IF NEW.color IS DISTINCT FROM OLD.color THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'epics', 'epic', NEW.id, NULL, 'epic_updated', 'color', to_jsonb(OLD.color), to_jsonb(NEW.color));
    END IF;
    RETURN NEW;
  END IF;
  INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
  VALUES (actor_uuid, 'epics', 'epic', OLD.id, NULL, 'epic_deleted', jsonb_build_object('name', OLD.name));
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. Trigger functions: sprints
-- =============================================================================
CREATE OR REPLACE FUNCTION log_audit_for_sprints()
RETURNS trigger AS $$
DECLARE
  actor_uuid UUID := current_user_id();
BEGIN
  IF actor_uuid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
    VALUES (actor_uuid, 'sprints', 'sprint', NEW.id, NULL, 'sprint_created', jsonb_build_object('name', NEW.name));
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'sprints', 'sprint', NEW.id, NULL, 'sprint_updated', 'name', to_jsonb(OLD.name), to_jsonb(NEW.name));
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'sprints', 'sprint', NEW.id, NULL, 'sprint_updated', 'description', to_jsonb(OLD.description), to_jsonb(NEW.description));
    END IF;
    IF NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'sprints', 'sprint', NEW.id, NULL, 'sprint_updated', 'dates', to_jsonb(jsonb_build_object('start', OLD.start_date, 'end', OLD.end_date)), to_jsonb(jsonb_build_object('start', NEW.start_date, 'end', NEW.end_date)));
    END IF;
    RETURN NEW;
  END IF;
  INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
  VALUES (actor_uuid, 'sprints', 'sprint', OLD.id, NULL, 'sprint_deleted', jsonb_build_object('name', OLD.name));
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. Trigger functions: assets
-- =============================================================================
CREATE OR REPLACE FUNCTION log_audit_for_assets()
RETURNS trigger AS $$
DECLARE
  actor_uuid UUID := current_user_id();
BEGIN
  IF actor_uuid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
    VALUES (actor_uuid, 'assets', 'asset', NEW.id, NULL, 'asset_created', jsonb_build_object('name', NEW.name));
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'assets', 'asset', NEW.id, NULL, 'asset_updated', 'name', to_jsonb(OLD.name), to_jsonb(NEW.name));
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'assets', 'asset', NEW.id, NULL, 'asset_updated', 'description', to_jsonb(OLD.description), to_jsonb(NEW.description));
    END IF;
    RETURN NEW;
  END IF;
  INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
  VALUES (actor_uuid, 'assets', 'asset', OLD.id, NULL, 'asset_deleted', jsonb_build_object('name', OLD.name));
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. Trigger functions: users
-- =============================================================================
CREATE OR REPLACE FUNCTION log_audit_for_users()
RETURNS trigger AS $$
DECLARE
  actor_uuid UUID := current_user_id();
BEGIN
  IF actor_uuid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
    VALUES (actor_uuid, 'users', 'user', NEW.id, NULL, 'user_created', jsonb_build_object('email', NEW.email, 'name', NEW.name));
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'users', 'user', NEW.id, NULL, 'user_updated', 'name', to_jsonb(OLD.name), to_jsonb(NEW.name));
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'users', 'user', NEW.id, NULL, 'user_updated', 'email', to_jsonb(OLD.email), to_jsonb(NEW.email));
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'users', 'user', NEW.id, NULL, 'user_updated', 'role', to_jsonb(OLD.role), to_jsonb(NEW.role));
    END IF;
    RETURN NEW;
  END IF;
  INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
  VALUES (actor_uuid, 'users', 'user', OLD.id, NULL, 'user_deleted', jsonb_build_object('email', OLD.email));
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. Trigger functions: roles
-- =============================================================================
CREATE OR REPLACE FUNCTION log_audit_for_roles()
RETURNS trigger AS $$
DECLARE
  actor_uuid UUID := current_user_id();
BEGIN
  IF actor_uuid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
    VALUES (actor_uuid, 'roles', 'role', NEW.id, NULL, 'role_created', jsonb_build_object('name', NEW.name));
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'roles', 'role', NEW.id, NULL, 'role_updated', 'name', to_jsonb(OLD.name), to_jsonb(NEW.name));
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, field_name, old_value, new_value)
      VALUES (actor_uuid, 'roles', 'role', NEW.id, NULL, 'role_updated', 'description', to_jsonb(OLD.description), to_jsonb(NEW.description));
    END IF;
    RETURN NEW;
  END IF;
  INSERT INTO audit_log (actor_id, module, resource_type, resource_id, ticket_id, event_type, metadata)
  VALUES (actor_uuid, 'roles', 'role', OLD.id, NULL, 'role_deleted', jsonb_build_object('name', OLD.name));
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 9. Attach triggers (only if table exists)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    DROP TRIGGER IF EXISTS trg_projects_audit ON projects;
    CREATE TRIGGER trg_projects_audit
      AFTER INSERT OR UPDATE OR DELETE ON projects
      FOR EACH ROW
      EXECUTE FUNCTION log_audit_for_projects();
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'epics') THEN
    DROP TRIGGER IF EXISTS trg_epics_audit ON epics;
    CREATE TRIGGER trg_epics_audit
      AFTER INSERT OR UPDATE OR DELETE ON epics
      FOR EACH ROW
      EXECUTE FUNCTION log_audit_for_epics();
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sprints') THEN
    DROP TRIGGER IF EXISTS trg_sprints_audit ON sprints;
    CREATE TRIGGER trg_sprints_audit
      AFTER INSERT OR UPDATE OR DELETE ON sprints
      FOR EACH ROW
      EXECUTE FUNCTION log_audit_for_sprints();
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
    DROP TRIGGER IF EXISTS trg_assets_audit ON assets;
    CREATE TRIGGER trg_assets_audit
      AFTER INSERT OR UPDATE OR DELETE ON assets
      FOR EACH ROW
      EXECUTE FUNCTION log_audit_for_assets();
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS trg_users_audit ON users;
    CREATE TRIGGER trg_users_audit
      AFTER INSERT OR UPDATE OR DELETE ON users
      FOR EACH ROW
      EXECUTE FUNCTION log_audit_for_users();
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN
    DROP TRIGGER IF EXISTS trg_roles_audit ON roles;
    CREATE TRIGGER trg_roles_audit
      AFTER INSERT OR UPDATE OR DELETE ON roles
      FOR EACH ROW
      EXECUTE FUNCTION log_audit_for_roles();
  END IF;
END;
$$;
