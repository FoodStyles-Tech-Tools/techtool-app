import type { Permission, PermissionFlags } from "@shared/types/auth"

export function buildPermissionFlags(permissions: Permission[] = []): PermissionFlags {
  const has = (resource: string, action: string) =>
    permissions.some((permission) => permission.resource === resource && permission.action === action)

  const canAccessSettings =
    has("users", "view") ||
    has("roles", "view") ||
    has("roles", "edit") ||
    has("roles", "create") ||
    has("roles", "manage") ||
    has("status", "manage") ||
    has("settings", "manage")

  return {
    canViewProjects: has("projects", "view"),
    canCreateProjects: has("projects", "create"),
    canEditProjects: has("projects", "edit"),
    canViewAssets: has("assets", "view"),
    canCreateAssets: has("assets", "create"),
    canEditAssets: has("assets", "edit"),
    canDeleteAssets: has("assets", "delete"),
    canManageAssets: has("assets", "manage"),
    canViewClockify: has("clockify", "view"),
    canManageClockify: has("clockify", "manage"),
    canViewTickets: has("tickets", "view"),
    canCreateTickets: has("tickets", "create"),
    canEditTickets: has("tickets", "edit"),
    canViewUsers: has("users", "view"),
    canCreateUsers: has("users", "create"),
    canEditUsers: has("users", "edit"),
    canDeleteUsers: has("users", "delete"),
    canViewRoles: has("roles", "view"),
    canCreateRoles: has("roles", "create"),
    canEditRoles: has("roles", "edit"),
    canDeleteRoles: has("roles", "delete"),
    canManageStatus: has("status", "manage"),
    canManageSettings: has("settings", "manage"),
    canAccessSettings,
    canViewAuditLog: has("audit_log", "view"),
  }
}
