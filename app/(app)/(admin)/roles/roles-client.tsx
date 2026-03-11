"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { emitPermissionsRefresh, usePermissions } from "@/hooks/use-permissions"
import { PageHeader } from "@/components/ui/page-header"
import { EntityPageLayout } from "@/components/ui/entity-page-layout"
import { DataState } from "@/components/ui/data-state"
import { FormDialogShell } from "@/components/ui/form-dialog-shell"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RoleForm } from "@/components/forms/role-form"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"

interface Permission {
  id?: string
  resource: string
  action: string
}

interface Role {
  id: string
  name: string
  description: string | null | undefined
  is_system: boolean
  permissions: Permission[]
  created_at: string
}

const resources = ["projects", "tickets", "users", "roles", "settings", "assets", "clockify", "status"] as const
const actions = ["view", "create", "edit", "delete", "manage"] as const

// Map resources to display names
const resourceLabels: Record<string, string> = {
  projects: "Project",
  tickets: "Ticket",
  users: "User",
  roles: "Roles",
  settings: "Settings",
  assets: "Assets",
  clockify: "Clockify",
  status: "Status",
}

type RolesClientProps = {
  initialRoles: Role[]
}

export default function RolesClient({ initialRoles }: RolesClientProps) {
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [editingPermissions, setEditingPermissions] = useState<Record<string, string[]>>({})
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const { flags } = usePermissions()
  const canCreateRoles = flags?.canCreateRoles ?? false
  const canEditRoles = flags?.canEditRoles ?? false
  const canDeleteRoles = flags?.canDeleteRoles ?? false

  useEffect(() => {
    setRoles(initialRoles)
  }, [initialRoles])

  // Helper to check if a role is admin (by name only)
  const checkIsAdminRole = (role: Role | { name: string; is_system?: boolean }) => {
    return role.name.toLowerCase() === "admin"
  }

  // Initialize editing permissions when roles load
  useEffect(() => {
    if (roles.length > 0) {
      const perms: Record<string, string[]> = {}
      const original: Record<string, string[]> = {}
      roles.forEach((role: Role) => {
        // For admin role, ensure all permissions are included
        if (checkIsAdminRole(role)) {
          const allPerms: string[] = []
          resources.forEach((resource) => {
            actions.forEach((action) => {
              allPerms.push(`${resource}:${action}`)
            })
          })
          perms[role.id] = allPerms
          original[role.id] = [...allPerms]
        } else {
          const rolePerms = role.permissions.map((p: Permission) => `${p.resource}:${p.action}`)
          perms[role.id] = rolePerms
          original[role.id] = [...rolePerms]
        }
      })
      setEditingPermissions(perms)
      setOriginalPermissions(original)
    }
  }, [roles])

  const handleDelete = async (id: string) => {
    setConfirmingDelete(true)
    try {
      const res = await fetch(`/api/roles/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setRoles((prev) => prev.filter((role) => role.id !== id))
        window.location.reload()
        emitPermissionsRefresh()
        toast("Role deleted successfully", "success")
      } else {
        const error = await res.json()
        toast(error.error || "Failed to delete role", "error")
      }
    } catch (error) {
      console.error("Error deleting role:", error)
      toast("Failed to delete role", "error")
    } finally {
      setConfirmingDelete(false)
      setDeletingRole(null)
    }
  }

  const handleEdit = (role: Role) => {
    setEditingRole(role)
    setIsDialogOpen(true)
  }

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingRole(null)
    }
  }

  const handleAddRole = () => {
    setEditingRole(null)
    setIsDialogOpen(true)
  }

  const togglePermission = (roleId: string, resource: string, action: string) => {
    const key = `${resource}:${action}`
    const current = editingPermissions[roleId] || []
    const isCurrentlyChecked = current.includes(key)
    
    let updated: string[]
    
    if (isCurrentlyChecked) {
      // Unchecking: remove this permission and all dependent permissions
      updated = current.filter((p) => {
        const [pResource, pAction] = p.split(":")
        if (pResource !== resource) return true // Keep permissions for other resources
        if (pAction === action) return false // Remove the unchecked permission
        // Remove dependent permissions based on hierarchy
        if (action === "view") {
          // If view is unchecked, remove all (create, edit, delete, manage)
          return false
        } else if (action === "create") {
          // If create is unchecked, remove edit and manage
          return pAction !== "edit" && pAction !== "manage"
        } else if (action === "edit") {
          // If edit is unchecked, remove manage
          return pAction !== "manage"
        } else if (action === "delete") {
          return pAction !== "delete"
        }
        return true
      })
    } else {
      // Checking: add this permission and ensure prerequisites are also checked
      updated = [...current]
      
      // Add prerequisites based on hierarchy
      if (action === "manage" && !current.includes(`${resource}:edit`)) {
        updated.push(`${resource}:edit`)
      }
      if ((action === "manage" || action === "edit") && !current.includes(`${resource}:create`)) {
        updated.push(`${resource}:create`)
      }
      if (
        (action === "manage" || action === "edit" || action === "create" || action === "delete") &&
        !current.includes(`${resource}:view`)
      ) {
        updated.push(`${resource}:view`)
      }
      
      // Add the permission itself if not already present
      if (!updated.includes(key)) {
        updated.push(key)
      }
    }
    
    setEditingPermissions({ ...editingPermissions, [roleId]: updated })
  }

  const savePermissions = async (roleId: string) => {
    const permissions = (editingPermissions[roleId] || []).map((p) => {
      const [resource, action] = p.split(":")
      return { resource, action }
    })

    setSaving({ ...saving, [roleId]: true })

    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permissions }),
      })

      if (res.ok) {
        // Update original permissions to match current state
        setOriginalPermissions({
          ...originalPermissions,
          [roleId]: [...(editingPermissions[roleId] || [])],
        })
        window.location.reload()
        emitPermissionsRefresh()
        toast("Permissions updated successfully", "success")
      } else {
        const error = await res.json()
        toast(error.error || "Failed to update permissions", "error")
      }
    } catch (error) {
      console.error("Error updating permissions:", error)
      toast("Failed to update permissions", "error")
    } finally {
      setSaving({ ...saving, [roleId]: false })
    }
  }

  const hasUnsavedChanges = (roleId: string) => {
    const current = (editingPermissions[roleId] || []).sort().join(",")
    const original = (originalPermissions[roleId] || []).sort().join(",")
    return current !== original
  }

  const roleHasPermission = (roleId: string, resource: string, action: string) => {
    const key = `${resource}:${action}`
    return (editingPermissions[roleId] || []).includes(key)
  }

  const isAdminRole = (role: Role) => {
    return role.name.toLowerCase() === "admin"
  }

  return (
    <EntityPageLayout
      header={
        <PageHeader
          title="Roles"
          description="Create roles and manage permission sets across the workspace."
          actions={
            canCreateRoles ? (
              <Button type="button" onClick={handleAddRole}>
                Create Role
              </Button>
            ) : null
          }
        />
      }
    >
      <DataState
        isEmpty={roles.length === 0}
        emptyTitle="No roles yet"
        emptyDescription="Create a role to start assigning permissions."
      >
        <div className="grid gap-3">
          {roles.map((role) => {
            const isEditable = !isAdminRole(role)
            return (
              <Card key={role.id} className="border">
                <CardHeader className="px-4 pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span className="capitalize">{role.name}</span>
                        {role.is_system && (
                          <Badge variant="secondary">System</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {role.description || (isAdminRole(role) ? "Full system access" : "No description")}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      {isEditable && (canEditRoles || canDeleteRoles) && (
                        <>
                          {canEditRoles && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(role)}
                            >
                              Edit
                            </Button>
                          )}
                          {canDeleteRoles && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingRole(role)}
                            >
                              Delete
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-3">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Page</TableHead>
                            {actions.map((action) => (
                              <TableHead
                                key={action}
                                className="text-center align-middle"
                              >
                                <span className="capitalize">{action}</span>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resources.map((resource) => (
                            <TableRow key={resource}>
                              <TableCell>
                                {resourceLabels[resource] || resource}
                              </TableCell>
                              {actions.map((action) => {
                                // Admin role always has all permissions
                                const isAdmin = isAdminRole(role)
                                const checked = isAdmin || roleHasPermission(role.id, resource, action)
                                
                                // Check if prerequisites are met
                                const hasView = isAdmin || roleHasPermission(role.id, resource, "view")
                                const hasCreate = isAdmin || roleHasPermission(role.id, resource, "create")
                                const hasEdit = isAdmin || roleHasPermission(role.id, resource, "edit")
                                
                                // Determine if checkbox should be disabled
                                let isDisabled = !isEditable
                                if (isEditable && !isAdmin) {
                                  if (action === "create" && !hasView) {
                                    isDisabled = true
                                  } else if (action === "edit" && !hasCreate) {
                                    isDisabled = true
                                  } else if (action === "delete" && !hasView) {
                                    isDisabled = true
                                  } else if (action === "manage" && !hasEdit) {
                                    isDisabled = true
                                  }
                                }
                                
                                return (
                                  <TableCell key={action} className="text-center align-middle">
                                    <div className="flex items-center justify-center">
                                      <input
                                        id={`${role.id}-${resource}-${action}`}
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => togglePermission(role.id, resource, action)}
                                        disabled={isDisabled}
                                        className="h-4 w-4 rounded border-slate-300 text-slate-900"
                                      />
                                    </div>
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {isEditable && (
                      <div className="flex justify-end">
                        <Button
                          onClick={() => savePermissions(role.id)}
                          size="sm"
                          disabled={saving[role.id] || !hasUnsavedChanges(role.id)}
                          variant={hasUnsavedChanges(role.id) ? "default" : "outline"}
                        >
                          {saving[role.id] ? "Saving..." : hasUnsavedChanges(role.id) ? "Save Permissions" : "No Changes"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </DataState>

      <FormDialogShell
        open={isDialogOpen}
        onOpenChange={handleOpenChange}
        title={editingRole ? "Edit Role" : "Create Role"}
        description={editingRole ? "Update role information." : "Create a new role with custom permissions."}
        formId="role-form"
        submitLabel={editingRole ? "Save" : "Create"}
      >
        <RoleForm
          formId="role-form"
          hideSubmitButton
          initialData={
            editingRole
              ? {
                  id: editingRole.id,
                  name: editingRole.name,
                  description: editingRole.description ?? undefined,
                }
              : undefined
          }
          onSuccess={() => {
            setIsDialogOpen(false)
            setEditingRole(null)
            toast(editingRole ? "Role updated" : "Role created")
            window.location.reload()
            emitPermissionsRefresh()
          }}
        />
      </FormDialogShell>

      <ConfirmDialog
        open={!!deletingRole}
        onOpenChange={(open) => !open && setDeletingRole(null)}
        title="Delete role?"
        description={`This will permanently remove the ${deletingRole?.name || "selected"} role.`}
        confirmLabel="Delete"
        destructive
        confirming={confirmingDelete}
        onConfirm={() => {
          if (deletingRole) {
            void handleDelete(deletingRole.id)
          }
        }}
      />
    </EntityPageLayout>
  )
}


