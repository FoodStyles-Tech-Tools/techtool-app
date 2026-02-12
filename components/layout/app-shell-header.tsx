"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Check, ChevronDown, PanelLeft } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { useProjects } from "@/hooks/use-projects"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"

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
  const router = useRouter()
  const [detailLabel, setDetailLabel] = useState<string | null>(null)
  const [includeInactiveProjects, setIncludeInactiveProjects] = useState(false)

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

  const { baseLabel, baseHref, nestedLabel, isProjectDetail, projectId } = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    const firstSegment = segments[0] || "dashboard"
    const secondSegment = segments[1]
    const isProjectDetailPage = firstSegment === "projects" && Boolean(secondSegment)

    return {
      baseLabel: PAGE_LABELS[firstSegment] || "Overview",
      baseHref: `/${firstSegment}`,
      nestedLabel: isProjectDetailPage ? detailLabel || "Project" : null,
      isProjectDetail: isProjectDetailPage,
      projectId: isProjectDetailPage ? secondSegment : null,
    }
  }, [pathname, detailLabel])

  const { data: projects = [], isLoading: projectsLoading } = useProjects({
    enabled: isProjectDetail,
    realtime: false,
  })

  const activeProjectName = useMemo(() => {
    if (!isProjectDetail) return nestedLabel
    const fromList = projects.find((project) => project.id === projectId)?.name
    return fromList || nestedLabel
  }, [isProjectDetail, nestedLabel, projectId, projects])

  const projectOptions = useMemo(
    () => {
      const visibleProjects = includeInactiveProjects
        ? projects
        : projects.filter(
            (project) =>
              project.status?.toLowerCase() !== "inactive" || project.id === projectId
          )
      return [...visibleProjects].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      )
    },
    [projects, includeInactiveProjects, projectId]
  )

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
                {isProjectDetail && projectId ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex max-w-[320px] items-center gap-1 rounded-md px-1 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                        aria-label="Switch project"
                      >
                        <span className="truncate">{activeProjectName}</span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      <DropdownMenuLabel>Switch Project</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="justify-between gap-2"
                        onSelect={(event) => event.preventDefault()}
                      >
                        <span>Include Inactive</span>
                        <Switch
                          checked={includeInactiveProjects}
                          onCheckedChange={setIncludeInactiveProjects}
                          aria-label="Include inactive projects"
                        />
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <div className="max-h-72 overflow-y-auto">
                        {projectsLoading ? (
                          <DropdownMenuItem disabled>Loading projects...</DropdownMenuItem>
                        ) : projectOptions.length === 0 ? (
                          <DropdownMenuItem disabled>No projects</DropdownMenuItem>
                        ) : (
                          projectOptions.map((project) => (
                            <DropdownMenuItem
                              key={project.id}
                              onSelect={() => router.push(`/projects/${project.id}`)}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="truncate">{project.name}</span>
                              {project.id === projectId ? (
                                <Check className="h-3.5 w-3.5 text-primary" />
                              ) : null}
                            </DropdownMenuItem>
                          ))
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <BreadcrumbPage>{nestedLabel}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
