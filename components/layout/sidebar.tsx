"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FolderKanban, Ticket, Users, Shield } from "lucide-react"
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
import { useState } from "react"
import { usePermissions } from "@/hooks/use-permissions"

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
    title: "Tickets",
    href: "/tickets",
    icon: Ticket,
    permission: { resource: "tickets", action: "view" },
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
    permission: { resource: "users", action: "view" },
  },
  {
    title: "Roles",
    href: "/roles",
    icon: Shield,
    permission: { resource: "roles", action: "view" },
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { hasPermission } = usePermissions()

  const handleSignOut = async () => {
    await signOut()
    router.push("/signin")
  }

  const user = session?.user

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-muted">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg">TechTool</span>
          </div>
        </div>
        <nav className="space-y-0.5 px-3">
          {navItems
            .filter((item) => {
              // Always show if no permission required
              if (!item.permission) return true
              
              // Special case for Roles: show if user has view, edit, create, or manage
              if (item.href === "/roles") {
                return (
                  hasPermission("roles", "view") ||
                  hasPermission("roles", "edit") ||
                  hasPermission("roles", "create") ||
                  hasPermission("roles", "manage")
                )
              }
              
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
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  )
}



