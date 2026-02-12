"use client"

import { useEffect, useMemo, useState } from "react"
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

export function AppShellHeader() {
  const pathname = usePathname()
  const [detailLabel, setDetailLabel] = useState<string | null>(null)

  useEffect(() => {
    const handleDetail = (event: Event) => {
      const customEvent = event as CustomEvent<{ label?: string | null }>
      const label = customEvent.detail?.label?.trim()
      setDetailLabel(label || null)
    }

    window.addEventListener("app-shell-breadcrumb-detail", handleDetail as EventListener)
    return () => {
      window.removeEventListener("app-shell-breadcrumb-detail", handleDetail as EventListener)
    }
  }, [])

  useEffect(() => {
    setDetailLabel(null)
  }, [pathname])

  const { baseLabel, baseHref, nestedLabel } = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    const firstSegment = segments[0] || "dashboard"
    const secondSegment = segments[1]
    const isProjectDetail = firstSegment === "projects" && Boolean(secondSegment)

    return {
      baseLabel: PAGE_LABELS[firstSegment] || "Overview",
      baseHref: `/${firstSegment}`,
      nestedLabel: isProjectDetail ? detailLabel || "Project" : null,
    }
  }, [pathname, detailLabel])

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
            <BreadcrumbItem>
              {nestedLabel ? (
                <BreadcrumbLink href={baseHref}>{baseLabel}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{baseLabel}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {nestedLabel ? <BreadcrumbSeparator /> : null}
            {nestedLabel ? (
              <BreadcrumbItem>
                <BreadcrumbPage>{nestedLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
