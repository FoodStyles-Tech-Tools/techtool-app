"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { PageHeader } from "@/components/ui/page-header"
import { EntityPageLayout } from "@/components/ui/entity-page-layout"
import { DataState } from "@/components/ui/data-state"
import { EntityTableShell } from "@/components/ui/entity-table-shell"
import { FormDialogShell } from "@/components/ui/form-dialog-shell"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "@/components/ui/toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserForm } from "@/components/forms/user-form"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface User {
  id: string
  email: string
  name: string | null
  discord_id?: string | null
  role?: string | null
  image: string | null
  created_at?: string
}

type UsersClientProps = {
  initialUsers: User[]
  roles: Array<{ id: string; name: string }>
}

export default function UsersClient({ initialUsers, roles }: UsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const { flags } = usePermissions()
  const canCreateUsers = flags?.canCreateUsers ?? false
  const canEditUsers = flags?.canEditUsers ?? false
  const canDeleteUsers = flags?.canDeleteUsers ?? false

  useEffect(() => {
    setUsers(initialUsers)
  }, [initialUsers])

  // Listen for scrollToUser event from keyboard shortcuts
  useEffect(() => {
    const handleScrollToUser = (event: CustomEvent<{ userId: string }>) => {
      const { userId } = event.detail
      const userRow = document.querySelector(`[data-user-id="${userId}"]`)
      if (userRow) {
        userRow.scrollIntoView({ behavior: "smooth", block: "center" })
        // Add a temporary highlight effect
        userRow.classList.add("bg-accent")
        setTimeout(() => {
          userRow.classList.remove("bg-accent")
        }, 2000)
      }
    }

    window.addEventListener("scrollToUser", handleScrollToUser as EventListener)
    return () => {
      window.removeEventListener("scrollToUser", handleScrollToUser as EventListener)
    }
  }, [])

  const handleDelete = async (id: string) => {
    setConfirmingDelete(true)
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setUsers((prev) => prev.filter((user) => user.id !== id))
        window.location.reload()
        toast("User deleted")
      } else {
        const error = await res.json()
        toast(error.error || "Failed to delete user", "error")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast("Failed to delete user", "error")
    } finally {
      setConfirmingDelete(false)
      setDeletingUser(null)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setIsDialogOpen(true)
  }

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingUser(null)
    }
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setIsDialogOpen(true)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "member":
        return "default"
      default:
        return "secondary"
    }
  }

  return (
    <EntityPageLayout
      header={
        <PageHeader
          title="Users"
          description="Manage who can access the workspace and what role they hold."
          actions={
            canCreateUsers ? (
              <Button type="button" onClick={handleAddUser}>
                Create User
              </Button>
            ) : null
          }
        />
      }
    >
      <DataState
        isEmpty={users.length === 0}
        emptyTitle="No users yet"
        emptyDescription="Add a user to get started."
      >
        <EntityTableShell>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 py-2 text-xs">User</TableHead>
                <TableHead className="h-9 py-2 text-xs">Email</TableHead>
                <TableHead className="h-9 py-2 text-xs">Discord ID</TableHead>
                <TableHead className="h-9 py-2 text-xs">Role</TableHead>
                <TableHead className="h-9 py-2 text-xs">Created</TableHead>
                <TableHead className="h-9 py-2 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow 
                  key={user.id} 
                  data-user-id={user.id}
                >
                  <TableCell className="py-2">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={user.image || ""}
                          alt={user.name || ""}
                        />
                        <AvatarFallback className="text-xs">
                          {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {user.name || "No name"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-sm">{user.email}</TableCell>
                  <TableCell className="py-2 text-sm">{user.discord_id || "-"}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant={getRoleColor(user.role || "member") as any} className="text-xs">
                      {user.role || "member"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-xs text-slate-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    {(canEditUsers || canDeleteUsers) && (
                      <div className="flex justify-end space-x-2">
                        {canEditUsers && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            Edit
                          </Button>
                        )}
                        {canDeleteUsers && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingUser(user)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </EntityTableShell>
      </DataState>

      <FormDialogShell
        open={isDialogOpen}
        onOpenChange={handleOpenChange}
        title={editingUser ? "Edit User" : "Create User"}
        description={editingUser ? "Update user information." : "Add a new user to the system."}
        formId="user-form"
        submitLabel={editingUser ? "Save" : "Create"}
      >
        <UserForm
          formId="user-form"
          hideSubmitButton
          initialData={
            editingUser
              ? {
                  id: editingUser.id,
                  email: editingUser.email,
                  discord_id: editingUser.discord_id ?? undefined,
                  role: editingUser.role ?? "member",
                  name: editingUser.name ?? undefined,
                }
              : undefined
          }
          roles={roles}
          onSuccess={() => {
            setIsDialogOpen(false)
            setEditingUser(null)
            toast(editingUser ? "User updated" : "User created")
            window.location.reload()
          }}
        />
      </FormDialogShell>

      <ConfirmDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title="Delete user?"
        description={`This will permanently remove ${deletingUser?.name || deletingUser?.email || "this user"}.`}
        confirmLabel="Delete"
        destructive
        confirming={confirmingDelete}
        onConfirm={() => {
          if (deletingUser) {
            void handleDelete(deletingUser.id)
          }
        }}
      />
    </EntityPageLayout>
  )
}


