-- Reset all RLS policies by dropping them
-- This migration drops all existing Row Level Security policies

-- Users table policies
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update themselves" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- Projects table policies
DROP POLICY IF EXISTS "Users can view projects with permission" ON projects;
DROP POLICY IF EXISTS "Users can create projects with permission" ON projects;
DROP POLICY IF EXISTS "Users can update projects with permission" ON projects;
DROP POLICY IF EXISTS "Users can delete projects with permission" ON projects;

-- Tickets table policies
DROP POLICY IF EXISTS "Users can view tickets with permission" ON tickets;
DROP POLICY IF EXISTS "Users can create tickets with permission" ON tickets;
DROP POLICY IF EXISTS "Users can update tickets with permission" ON tickets;
DROP POLICY IF EXISTS "Users can delete tickets with permission" ON tickets;

-- Departments table policies
DROP POLICY IF EXISTS "Users can view departments" ON departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

-- Roles table policies
DROP POLICY IF EXISTS "Users can view roles with permission" ON roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;

-- Permissions table policies
DROP POLICY IF EXISTS "Users can view permissions with permission" ON permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON permissions;

-- Subtasks table policies
DROP POLICY IF EXISTS "Users can view subtasks" ON subtasks;
DROP POLICY IF EXISTS "Users can manage subtasks" ON subtasks;

-- Epics table policies
DROP POLICY IF EXISTS "Users can view epics with permission" ON epics;
DROP POLICY IF EXISTS "Users can create epics with permission" ON epics;
DROP POLICY IF EXISTS "Users can update epics with permission" ON epics;
DROP POLICY IF EXISTS "Users can delete epics with permission" ON epics;

