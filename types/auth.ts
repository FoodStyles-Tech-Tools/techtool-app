export type Permission = {
  resource: string
  action: string
}

export type PermissionFlags = {
  canViewProjects: boolean
  canCreateProjects: boolean
  canEditProjects: boolean
  canViewAssets: boolean
  canCreateAssets: boolean
  canEditAssets: boolean
  canDeleteAssets: boolean
  canManageAssets: boolean
  canViewClockify: boolean
  canManageClockify: boolean
  canViewTickets: boolean
  canCreateTickets: boolean
  canEditTickets: boolean
  canViewUsers: boolean
  canCreateUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
  canViewRoles: boolean
  canCreateRoles: boolean
  canEditRoles: boolean
  canDeleteRoles: boolean
  canManageStatus: boolean
  canManageSettings: boolean
  canAccessSettings: boolean
}

export type PermissionSnapshot = {
  user: {
    id: string
    email: string
    name: string | null
    role: string | null
    image: string | null
    permissions: Permission[]
  } | null
  flags: PermissionFlags
  ts: number
}
