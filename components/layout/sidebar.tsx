"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FolderKanban, Package, Ticket, Keyboard, Clock, Settings } from "lucide-react"
import { CommentNotificationsDropdown } from "@/components/comment-notifications-dropdown"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut, useSession } from "@/lib/auth-client"
import { SettingsDialog } from "@/components/settings/settings-dialog"
import { usePermissions } from "@/hooks/use-permissions"
import { KeyboardShortcutDialog } from "@/components/keyboard-shortcut-dialog"
import { VersionIndicator } from "@/components/version-indicator"
import { useSignOutOverlay } from "@/components/signout-overlay"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: null, // Always visible
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    permission: { resource: "projects", action: "view" },
  },
  {
    title: "Assets",
    href: "/assets",
    icon: Package,
    permission: { resource: "assets", action: "view" },
  },
  {
    title: "Clockify",
    href: "/clockify",
    icon: Clock,
    permission: { resource: "clockify", action: "view" },
  },
  {
    title: "Tickets",
    href: "/tickets",
    icon: Ticket,
    permission: { resource: "tickets", action: "view" },
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    permission: null,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const { hasPermission } = usePermissions()
  const { show: showOverlay, hide: hideOverlay } = useSignOutOverlay()

  const handleSignOut = async () => {
    try {
      showOverlay()
      await signOut()
      router.push("/signin")
    } finally {
      hideOverlay()
    }
  }

  const user = session?.user

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.altKey
      if (!isModifierPressed || event.key !== "ArrowDown") {
        return
      }

      const target = event.target as HTMLElement | null
      const isInputElement =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable

      if (isInputElement) {
        return
      }

      event.preventDefault()
      setShortcutsOpen(true)
    }

    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-muted">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg">TechTool</span>
            <CommentNotificationsDropdown />
          </div>
        </div>
        <nav className="space-y-0.5 px-3">
          {navItems
            .filter((item) => {
              // Special case for Roles: show if user has view, edit, create, or manage
              if (item.href === "/roles") {
                return (
                  hasPermission("roles", "view") ||
                  hasPermission("roles", "edit") ||
                  hasPermission("roles", "create") ||
                  hasPermission("roles", "manage")
                )
              }

              if (item.href === "/settings") {
                return (
                  hasPermission("users", "view") ||
                  hasPermission("roles", "view") ||
                  hasPermission("roles", "edit") ||
                  hasPermission("roles", "create") ||
                  hasPermission("roles", "manage") ||
                  hasPermission("status", "manage") ||
                  hasPermission("settings", "manage")
                )
              }

              // Always show if no permission required
              if (!item.permission) return true
              
              // Check if user has the required permission
              return hasPermission(
                item.permission.resource as any,
                item.permission.action as any
              )
            })
            .map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center space-x-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
        </nav>
      </div>
      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center space-x-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus:outline-none">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                <AvatarFallback>
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-none truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground truncate mt-1">
                  {user?.email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm leading-none">
                  {user?.name || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="pt-3 px-0.5">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-3">
              <VersionIndicator className="h-full" />
            </div>
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border/70 px-2 py-1 transition-colors hover:border-primary hover:bg-primary/5"
            >
              <Keyboard className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <KeyboardShortcutDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </aside>
  )
}










