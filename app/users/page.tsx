"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/use-permissions"
import { useUsers } from "@/hooks/use-users"
import { useRequirePermission } from "@/hooks/use-require-permission"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Pencil } from "lucide-react"
import { UserForm } from "@/components/forms/user-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface User {
  id: string
  email: string
  name: string | null
  role?: string | null
  image: string | null
  created_at?: string
}

type UserFromHook = NonNullable<ReturnType<typeof useUsers>['data']>[number]

export default function UsersPage() {
  // Require view permission for users - redirects if not authorized
  const { hasPermission: canView, loading: permissionLoading } = useRequirePermission("users", "view")
  const { data: usersData, isLoading: usersLoading, refetch: fetchUsers } = useUsers()
  const users = usersData || []
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserFromHook | null>(null)
  const { hasPermission } = usePermissions()

  // Don't render content if user doesn't have permission (will redirect)
  if (permissionLoading || !canView) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return
    }

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchUsers()
      } else {
        const error = await res.json()
        alert(error.error || "Failed to delete user")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("Failed to delete user")
    }
  }

  const handleEdit = (user: UserFromHook) => {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage users and their roles
          </p>
        </div>
        {hasPermission("users", "create") && (
          <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={handleAddUser}>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Edit User" : "Add New User"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Update user information"
                  : "Add a new user to the system"}
              </DialogDescription>
            </DialogHeader>
            <UserForm
              initialData={
                editingUser
                  ? {
                      id: editingUser.id,
                      email: editingUser.email,
                      role: editingUser.role ?? "member",
                      name: editingUser.name ?? undefined,
                    }
                  : undefined
              }
              onSuccess={() => {
                setIsDialogOpen(false)
                setEditingUser(null)
                fetchUsers()
              }}
            />
          </DialogContent>
        </Dialog>
        )}
      </div>

      {usersLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : users.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No users yet. Add one to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 py-2 text-xs">User</TableHead>
                <TableHead className="h-9 py-2 text-xs">Email</TableHead>
                <TableHead className="h-9 py-2 text-xs">Role</TableHead>
                <TableHead className="h-9 py-2 text-xs">Created</TableHead>
                <TableHead className="h-9 py-2 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50">
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
                  <TableCell className="py-2">
                    <Badge variant={getRoleColor(user.role || "member") as any} className="text-xs">
                      {user.role || "member"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    {(hasPermission("users", "edit") || hasPermission("users", "delete")) && (
                      <div className="flex justify-end space-x-2">
                        {hasPermission("users", "edit") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission("users", "delete") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
