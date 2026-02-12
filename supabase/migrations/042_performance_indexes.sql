-- Performance optimization indexes
-- These composite indexes optimize common query patterns

-- Tickets: project_id + created_at (most common filter + sort)
CREATE INDEX IF NOT EXISTS idx_tickets_project_created ON tickets(project_id, created_at DESC) WHERE project_id IS NOT NULL;

-- Tickets: status + created_at (filter by status, sort by date)
CREATE INDEX IF NOT EXISTS idx_tickets_status_created ON tickets(status, created_at DESC);

-- Tickets: assignee_id + created_at (filter by assignee, sort by date)
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_created ON tickets(assignee_id, created_at DESC) WHERE assignee_id IS NOT NULL;

-- Tickets: project_id + status + created_at (common combination)
CREATE INDEX IF NOT EXISTS idx_tickets_project_status_created ON tickets(project_id, status, created_at DESC) WHERE project_id IS NOT NULL;

-- Tickets: department_id + created_at
CREATE INDEX IF NOT EXISTS idx_tickets_department_created ON tickets(department_id, created_at DESC) WHERE department_id IS NOT NULL;

-- Tickets: requested_by_id + created_at
CREATE INDEX IF NOT EXISTS idx_tickets_requested_by_created ON tickets(requested_by_id, created_at DESC);

-- Epics: project_id + created_at
CREATE INDEX IF NOT EXISTS idx_epics_project_created ON epics(project_id, created_at DESC);

-- Sprints: project_id + created_at
CREATE INDEX IF NOT EXISTS idx_sprints_project_created ON sprints(project_id, created_at DESC);

-- Users: covering index for permission checks (email, id, role)
-- This allows the permission check query to use index-only scan
CREATE INDEX IF NOT EXISTS idx_users_email_covering ON users(email, id, role);

-- Roles: name index for case-insensitive lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_roles_name_lower ON roles(LOWER(name));

-- Permissions: composite index for permission checks
CREATE INDEX IF NOT EXISTS idx_permissions_role_resource_action ON permissions(role_id, resource, action);

-- Projects: owner_id + created_at
CREATE INDEX IF NOT EXISTS idx_projects_owner_created ON projects(owner_id, created_at DESC);
