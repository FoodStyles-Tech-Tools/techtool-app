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
import { signOut, useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/use-permissions"
import { useSignOutOverlay } from "@/components/signout-overlay"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import { DeletedTicketsPanel } from "@/components/settings/deleted-tickets-panel"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CombinedUser = {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
}

type SettingsSection =
  | "account"
  | "preferences"
  | "deleted_tickets"

const navButtonClassName =
  "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors"
const sectionClassName = "rounded-lg border border-border/50 bg-background p-4"
const sectionTitleClassName = "text-sm font-medium text-foreground"
const nativeSelectClassName =
  "h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/20 disabled:cursor-not-allowed disabled:opacity-70"

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { user: permissionsUser } = usePermissions()
  const { preferences, updatePreferences, isUpdating } = useUserPreferences()
  const user = useMemo<CombinedUser | null>(
    () => permissionsUser || (session?.user as CombinedUser) || null,
    [permissionsUser, session?.user]
  )
  const [signingOut, setSigningOut] = useState(false)
  const [activeSection, setActiveSection] = useState<SettingsSection>("preferences")
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
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-64 flex-col border-r bg-muted/15">
            <div className="space-y-1 px-4 pb-4 pt-6">
              <div className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                Account
              </div>
              <button
                type="button"
                onClick={() => setActiveSection("account")}
                className={`${navButtonClassName} ${
                  activeSection === "account"
                    ? "border-border/60 bg-background text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border/40 hover:bg-background"
                }`}
              >
                Account
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("preferences")}
                className={`${navButtonClassName} ${
                  activeSection === "preferences"
                    ? "border-border/60 bg-background text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border/40 hover:bg-background"
                }`}
              >
                Preferences
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("deleted_tickets")}
                className={`${navButtonClassName} ${
                  activeSection === "deleted_tickets"
                    ? "border-border/60 bg-background text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border/40 hover:bg-background"
                }`}
              >
                Deleted
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {activeSection === "account" && (
                <>
                  <section className={sectionClassName}>
                    <h3 className={sectionTitleClassName}>Account</h3>
                    <div className="mt-4 flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                        <AvatarFallback className="text-lg">
                          {user?.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user?.name || "User"}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                        <div className="mt-2 inline-flex rounded-full border border-border/60 px-2.5 py-1 text-xs capitalize text-muted-foreground">
                          {user?.role || "member"}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={sectionClassName}>
                    <h3 className={sectionTitleClassName}>Account Information</h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="mb-1 text-sm text-muted-foreground">Email</p>
                        <p className="text-sm">{user?.email || "-"}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-sm text-muted-foreground">Role</p>
                        <p className="text-sm capitalize">{user?.role || "-"}</p>
                      </div>
                    </div>
                  </section>

                  <section className={sectionClassName}>
                    <h3 className={sectionTitleClassName}>Actions</h3>
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
                  </section>
                </>
              )}

              {activeSection === "preferences" && (
                <>
                  <section className={sectionClassName}>
                    <h3 className={sectionTitleClassName}>Preferences</h3>
                    <div className="mt-4 space-y-6">
                      <div className="rounded-md border border-border/50 p-4">
                        <label htmlFor="group-by-epic-default" className="flex items-start gap-3">
                          <input
                            id="group-by-epic-default"
                            type="checkbox"
                            checked={preferences.group_by_epic}
                            onChange={(event) => {
                              updatePreferences({ group_by_epic: event.target.checked })
                            }}
                            disabled={isUpdating}
                            className="mt-0.5 h-4 w-4 rounded border-border text-foreground"
                          />
                          <span className="space-y-1">
                            <span className="block text-sm font-medium text-foreground">
                              Default &quot;Group by Epic&quot; for Projects
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              When enabled, projects will default to grouping tickets by Epic
                            </span>
                          </span>
                        </label>
                      </div>

                      <div className="rounded-md border border-border/50 p-4">
                        <label htmlFor="tickets-view-default" className="block text-sm font-medium text-foreground">
                          Default Tickets View
                        </label>
                        <select
                          id="tickets-view-default"
                          value={preferences.tickets_view || "table"}
                          onChange={(event) => {
                            updatePreferences({ tickets_view: event.target.value as "table" | "kanban" })
                          }}
                          disabled={isUpdating}
                          className={nativeSelectClassName}
                        >
                          <option value="table">Table</option>
                          <option value="kanban">Kanban</option>
                        </select>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Choose the default view for the Tickets page
                        </p>
                      </div>
                    </div>
                  </section>
                </>
              )}
              {activeSection === "deleted_tickets" && (
                <DeletedTicketsPanel />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
