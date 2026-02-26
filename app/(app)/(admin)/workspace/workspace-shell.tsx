"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import { cn } from "@/lib/utils"

type WorkspaceTab = {
  label: string
  href: string
  visible: boolean
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { flags } = usePermissions()

  const tabs = useMemo<WorkspaceTab[]>(
    () => [
      {
        label: "Status",
        href: "/workspace/status",
        visible: Boolean(flags?.canManageStatus),
      },
      {
        label: "Epic",
        href: "/workspace/epic",
        visible: Boolean(flags?.canEditProjects),
      },
      {
        label: "Sprint",
        href: "/workspace/sprint",
        visible: Boolean(flags?.canEditProjects),
      },
    ],
    [flags?.canEditProjects, flags?.canManageStatus]
  )

  const visibleTabs = tabs.filter((tab) => tab.visible)

  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
      <aside className="w-52 shrink-0 overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-3 py-3">
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspace</p>
          <p className="px-1 pt-1 text-[11px] text-muted-foreground">Project configuration</p>
        </div>
        <div className="p-2">
          <div className="space-y-1">
            {visibleTabs.map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "block rounded-md border border-transparent px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "selected-ui"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
            {visibleTabs.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No workspace sections available.</p>
            ) : null}
          </div>
        </div>
      </aside>
      <section className="min-w-0 flex-1 overflow-hidden rounded-lg border bg-card">
        <div className="h-full overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  )
}
