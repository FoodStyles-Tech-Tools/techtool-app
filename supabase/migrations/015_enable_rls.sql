-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- Function to set current user email (called by client before queries)
CREATE OR REPLACE FUNCTION set_user_context(user_email TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_email', user_email, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user email
CREATE OR REPLACE FUNCTION current_user_email()
RETURNS TEXT AS $$
BEGIN
  -- Try to get email from JWT claim first (if using Supabase Auth)
  -- Then try session variable (set by set_user_context)
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'email',
    current_setting('app.current_user_email', true)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current user ID from email
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
DECLARE
  user_email TEXT;
  user_uuid UUID;
BEGIN
  user_email := current_user_email();
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT id INTO user_uuid
  FROM users
  WHERE email = user_email;
  
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  resource_name permission_resource,
  action_name permission_action
) RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  user_role_name TEXT;
BEGIN
  user_email := current_user_email();
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's role
  SELECT role::TEXT INTO user_role_name
  FROM users
  WHERE email = user_email;
  
  IF user_role_name IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admin has all permissions
  IF user_role_name = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if role has the permission
  RETURN EXISTS (
    SELECT 1
    FROM permissions p
    JOIN roles r ON p.role_id = r.id
    WHERE r.name = user_role_name
      AND p.resource = resource_name
      AND p.action = action_name
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Users table policies
-- Users can view all users (for dropdowns, etc.)
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  USING (current_user_email() IS NOT NULL);

-- Users can update their own record
CREATE POLICY "Users can update themselves"
  ON users FOR UPDATE
  USING (email = current_user_email());

-- Only admins can insert/delete users (handled via API with proper auth)
CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING (user_has_permission('users'::permission_resource, 'manage'::permission_action));

-- Projects table policies
-- Users can view projects if they have view permission
CREATE POLICY "Users can view projects with permission"
  ON projects FOR SELECT
  USING (
    user_has_permission('projects'::permission_resource, 'view'::permission_action)
  );

-- Users can create projects if they have create permission
CREATE POLICY "Users can create projects with permission"
  ON projects FOR INSERT
  WITH CHECK (
    user_has_permission('projects'::permission_resource, 'create'::permission_action)
    AND owner_id = current_user_id()
  );

-- Users can update projects if they have edit permission and are owner or admin
CREATE POLICY "Users can update projects with permission"
  ON projects FOR UPDATE
  USING (
    user_has_permission('projects'::permission_resource, 'edit'::permission_action)
    AND (
      owner_id = current_user_id()
      OR user_has_permission('projects'::permission_resource, 'manage'::permission_action)
    )
  );

-- Users can delete projects if they have delete permission and are owner or admin
CREATE POLICY "Users can delete projects with permission"
  ON projects FOR DELETE
  USING (
    user_has_permission('projects'::permission_resource, 'delete'::permission_action)
    AND (
      owner_id = current_user_id()
      OR user_has_permission('projects'::permission_resource, 'manage'::permission_action)
    )
  );

-- Tickets table policies
-- Users can view tickets if they have view permission
CREATE POLICY "Users can view tickets with permission"
  ON tickets FOR SELECT
  USING (
    user_has_permission('tickets'::permission_resource, 'view'::permission_action)
  );

-- Users can create tickets if they have create permission
CREATE POLICY "Users can create tickets with permission"
  ON tickets FOR INSERT
  WITH CHECK (
    user_has_permission('tickets'::permission_resource, 'create'::permission_action)
    AND requested_by_id = current_user_id()
  );

-- Users can update tickets if they have edit permission
CREATE POLICY "Users can update tickets with permission"
  ON tickets FOR UPDATE
  USING (
    user_has_permission('tickets'::permission_resource, 'edit'::permission_action)
  );

-- Users can delete tickets if they have delete permission
CREATE POLICY "Users can delete tickets with permission"
  ON tickets FOR DELETE
  USING (
    user_has_permission('tickets'::permission_resource, 'delete'::permission_action)
  );

-- Departments table policies
-- Users can view departments if they have projects view permission
CREATE POLICY "Users can view departments"
  ON departments FOR SELECT
  USING (
    user_has_permission('projects'::permission_resource, 'view'::permission_action)
  );

-- Only admins can manage departments
CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  USING (
    user_has_permission('projects'::permission_resource, 'manage'::permission_action)
  );

-- Roles table policies
-- Users can view roles if they have roles view permission
CREATE POLICY "Users can view roles with permission"
  ON roles FOR SELECT
  USING (
    user_has_permission('roles'::permission_resource, 'view'::permission_action)
  );

-- Only admins can manage roles
CREATE POLICY "Admins can manage roles"
  ON roles FOR ALL
  USING (
    user_has_permission('roles'::permission_resource, 'manage'::permission_action)
  );

-- Permissions table policies
-- Users can view permissions if they have roles view permission
CREATE POLICY "Users can view permissions with permission"
  ON permissions FOR SELECT
  USING (
    user_has_permission('roles'::permission_resource, 'view'::permission_action)
  );

-- Only admins can manage permissions
CREATE POLICY "Admins can manage permissions"
  ON permissions FOR ALL
  USING (
    user_has_permission('roles'::permission_resource, 'manage'::permission_action)
  );

-- Subtasks table policies
-- Users can view subtasks if they can view the parent ticket
CREATE POLICY "Users can view subtasks"
  ON subtasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tickets
      WHERE tickets.id = subtasks.ticket_id
      AND user_has_permission('tickets'::permission_resource, 'view'::permission_action)
    )
  );

-- Users can manage subtasks if they can edit the parent ticket
CREATE POLICY "Users can manage subtasks"
  ON subtasks FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM tickets
      WHERE tickets.id = subtasks.ticket_id
      AND user_has_permission('tickets'::permission_resource, 'edit'::permission_action)
    )
  );

