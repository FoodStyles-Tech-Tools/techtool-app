-- Create roles and permissions system
-- This allows fine-grained control over what each role can do

-- Permissions enum for different actions
CREATE TYPE permission_action AS ENUM ('view', 'create', 'edit', 'delete', 'manage');

-- Resources enum for different entities
CREATE TYPE permission_resource AS ENUM ('projects', 'tickets', 'users', 'roles', 'settings');

-- Roles table (extends the existing user_role enum)
-- We'll keep the enum for backward compatibility but add a roles table for more control
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- System roles (admin, member) cannot be deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table - defines what each role can do
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  resource permission_resource NOT NULL,
  action permission_action NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, resource, action)
);

-- Insert default system roles
INSERT INTO roles (name, description, is_system) VALUES
  ('admin', 'Full system access', TRUE),
  ('member', 'Standard user access', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Set default permissions for admin (all permissions)
INSERT INTO permissions (role_id, resource, action)
SELECT r.id, res.resource, act.action
FROM roles r
CROSS JOIN (SELECT unnest(enum_range(NULL::permission_resource)) AS resource) res
CROSS JOIN (SELECT unnest(enum_range(NULL::permission_action)) AS action) act
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Set default permissions for member (view, create, edit for projects/tickets)
INSERT INTO permissions (role_id, resource, action)
SELECT r.id, res.resource::permission_resource, act.action::permission_action
FROM roles r
CROSS JOIN (VALUES 
  ('projects'::permission_resource), 
  ('tickets'::permission_resource)
) AS res(resource)
CROSS JOIN (VALUES 
  ('view'::permission_action), 
  ('create'::permission_action), 
  ('edit'::permission_action)
) AS act(action)
WHERE r.name = 'member'
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_permissions_role_id ON permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(
  user_email TEXT,
  resource_name permission_resource,
  action_name permission_action
) RETURNS BOOLEAN AS $$
DECLARE
  user_role_name TEXT;
BEGIN
  -- Get user's role
  SELECT role::TEXT INTO user_role_name
  FROM users
  WHERE email = user_email;
  
  IF user_role_name IS NULL THEN
    RETURN FALSE;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

