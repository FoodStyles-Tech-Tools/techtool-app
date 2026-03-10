"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Check, ChevronDown, PanelLeft } from "lucide-react"
import { useProjects } from "@/hooks/use-projects"

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  assets: "Assets",
  clockify: "Clockify",
  report: "Report",
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
    <header className="flex h-14 shrink-0 items-center border-b border-border/50 bg-background px-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Sidebar"
          className="inline-flex h-8 w-8 items-center justify-center rounded border border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/40 hover:text-foreground"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-border/70" />
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <li className="min-w-0">
              {nestedLabel ? (
                <a href={baseHref} className="transition-colors hover:text-foreground">
                  {baseLabel}
                </a>
              ) : (
                <span className="font-medium text-foreground">{baseLabel}</span>
              )}
            </li>
            {nestedLabel ? <li aria-hidden="true" className="text-border">/</li> : null}
            {nestedLabel ? (
              <li className="min-w-0">
                {isProjectDetail && projectId ? (
                  <details className="relative">
                    <summary className="inline-flex max-w-[320px] list-none items-center gap-1 rounded px-1 py-0.5 text-sm font-medium text-foreground hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                      <span className="truncate">{activeProjectName}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </summary>
                    <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-lg border border-border/60 bg-background p-2 shadow-md">
                      <div className="border-b border-border/50 px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Projects
                      </div>
                      <label className="mt-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/40">
                        <span>Include inactive</span>
                        <input
                          type="checkbox"
                          checked={includeInactiveProjects}
                          onChange={(event) => setIncludeInactiveProjects(event.target.checked)}
                          className="h-4 w-4 rounded border-border text-foreground"
                          aria-label="Include inactive projects"
                        />
                      </label>
                      <div className="mt-2 max-h-72 overflow-y-auto">
                        {projectsLoading ? (
                          <div className="rounded-md px-2 py-2 text-sm text-muted-foreground">
                            Loading projects...
                          </div>
                        ) : projectOptions.length === 0 ? (
                          <div className="rounded-md px-2 py-2 text-sm text-muted-foreground">
                            No projects
                          </div>
                        ) : (
                          projectOptions.map((project) => (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => router.push(`/projects/${project.id}`)}
                              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/40"
                            >
                              <span className="truncate">{project.name}</span>
                              {project.id === projectId ? (
                                <Check className="h-3.5 w-3.5 text-primary" />
                              ) : null}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </details>
                ) : (
                  <span className="truncate font-medium text-foreground">{nestedLabel}</span>
                )}
              </li>
            ) : null}
          </ol>
        </nav>
      </div>
    </header>
  )
}
