"use client"

import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { useRoles } from "@/hooks/use-roles"
import { useRequirePermission } from "@/hooks/use-require-permission"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Pencil, Save } from "lucide-react"
import { RoleForm } from "@/components/forms/role-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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

const resources = ["projects", "tickets", "users", "roles", "settings", "assets", "clockify"] as const
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
}

export default function RolesPage() {
  // Require view permission for roles - redirects if not authorized
  const { hasPermission: canView, loading: permissionLoading } = useRequirePermission("roles", "view")
  const queryClient = useQueryClient()
  const { data: rolesData, isLoading: rolesLoading, refetch: refetchRoles } = useRoles()
  const roles = useMemo(() => rolesData || [], [rolesData])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editingPermissions, setEditingPermissions] = useState<Record<string, string[]>>({})
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const { hasPermission } = usePermissions()

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

  // Don't render content if user doesn't have permission (will redirect)
  if (permissionLoading || !canView) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this role?")) {
      return
    }

    try {
      const res = await fetch(`/api/roles/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        refetchRoles()
        // Invalidate user permissions to refresh sidebar and other components
        queryClient.invalidateQueries({ queryKey: ["user-permissions"] })
        toast("Role deleted successfully", "success")
      } else {
        const error = await res.json()
        toast(error.error || "Failed to delete role", "error")
      }
    } catch (error) {
      console.error("Error deleting role:", error)
      toast("Failed to delete role", "error")
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
        refetchRoles()
        // Invalidate user permissions to refresh sidebar and other components
        queryClient.invalidateQueries({ queryKey: ["user-permissions"] })
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage roles and their permissions
          </p>
        </div>
        {hasPermission("roles", "create") && (
          <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={handleAddRole}>
                <Plus className="mr-2 h-4 w-4" />
                Add Role
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRole ? "Edit Role" : "Add New Role"}
              </DialogTitle>
              <DialogDescription>
                {editingRole
                  ? "Update role information"
                  : "Create a new role with custom permissions"}
              </DialogDescription>
            </DialogHeader>
            <RoleForm
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
                refetchRoles()
                // Invalidate user permissions to refresh sidebar and other components
                queryClient.invalidateQueries({ queryKey: ["user-permissions"] })
              }}
            />
          </DialogContent>
        </Dialog>
        )}
      </div>

      {rolesLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
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
                      {isEditable && (hasPermission("roles", "edit") || hasPermission("roles", "delete")) && (
                        <>
                          {hasPermission("roles", "edit") && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEdit(role)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission("roles", "delete") && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(role.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
                                      <Checkbox
                                        id={`${role.id}-${resource}-${action}`}
                                        checked={checked}
                                        onCheckedChange={() =>
                                          togglePermission(role.id, resource, action)
                                        }
                                        disabled={isDisabled}
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
                          <Save className="mr-2 h-4 w-4" />
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
      )}
    </div>
  )
}
