"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { PanelLeft } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  assets: "Assets",
  clockify: "Clockify",
  tickets: "Tickets",
  users: "Users",
  roles: "Roles",
  status: "Status",
}

const ADMIN_SEGMENTS = new Set(["users", "roles", "status"])

export function AppShellHeader() {
  const pathname = usePathname()

  const { sectionLabel, pageLabel } = useMemo(() => {
    const firstSegment = pathname.split("/").filter(Boolean)[0] || "dashboard"
    const section = ADMIN_SEGMENTS.has(firstSegment) ? "Administration" : "Build Your Application"
    return {
      sectionLabel: section,
      pageLabel: PAGE_LABELS[firstSegment] || "Overview",
    }
  }, [pathname])

  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4">
        <button
          type="button"
          aria-label="Sidebar"
          className="-ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">{sectionLabel}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
