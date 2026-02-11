"use client"

type PermissionsBootstrapPayload = {
  user: {
    id: string
    email: string
    name: string | null
    role: string | null
    image: string | null
    permissions: Array<{ resource: string; action: string }>
  } | null
  flags: {
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
  ts: number
}

const CACHE_KEY = "tt.permissions"

declare global {
  interface Window {
    __PERMISSIONS_CACHE__?: PermissionsBootstrapPayload
  }
}

export function PermissionsBootstrap({ payload }: { payload: PermissionsBootstrapPayload }) {
  if (typeof window !== "undefined") {
    window.__PERMISSIONS_CACHE__ = payload
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
    } catch {
      // ignore cache write failures
    }
  }

  return null
}
