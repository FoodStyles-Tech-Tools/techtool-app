"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { signOut, useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import { usePermissions } from "@/hooks/use-permissions"
import { useSignOutOverlay } from "@/components/signout-overlay"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user: permissionsUser } = usePermissions()
  const user = useMemo(() => permissionsUser || session?.user || null, [permissionsUser, session?.user])
  const [signingOut, setSigningOut] = useState(false)
  const { show, hide } = useSignOutOverlay()

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      show()
      await signOut()
      router.push("/signin")
      onOpenChange(false)
    } catch (error) {
      hide()
      setSigningOut(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">Preferences</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Left Navigation Pane */}
          <div className="w-64 border-r bg-muted/30 flex flex-col">
            <div className="px-4 pt-6 pb-4 space-y-1">
              <div className="px-3 py-2 text-xs text-muted-foreground uppercase tracking-wider">
                Account
              </div>
              <div className="px-3 py-2 rounded-md bg-accent text-accent-foreground text-sm">
                Preferences
              </div>
            </div>
          </div>

          {/* Right Content Pane */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Account Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Account</h3>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                    <AvatarFallback className="text-lg">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user?.name || "User"}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <Badge className="mt-2 capitalize">{user?.role}</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Appearance Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Appearance</h3>
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
                    <SelectTrigger id="theme" className="w-[180px]">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose your preferred color scheme
                  </p>
                </div>
              </div>

              <Separator />

              {/* Account Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Account Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="text-sm">{user?.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Role</p>
                    <p className="text-sm capitalize">{user?.role || "-"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Actions</h3>
                <Button variant="destructive" onClick={handleSignOut} disabled={signingOut}>
                  {signingOut ? (
                    <>
                      <span className="mr-2 inline-flex h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Signing Out...
                    </>
                  ) : (
                    "Sign Out"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
