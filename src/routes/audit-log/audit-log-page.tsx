"use client"

import { useEffect, useMemo, useState } from "react"
import { usePermissions } from "@client/hooks/use-permissions"
import { useAuditLogAll, type AuditLogItem } from "@client/hooks/use-audit-log"
import { PageHeader } from "@client/components/ui/page-header"
import { PageLayout } from "@client/components/ui/page-layout"
import { DataState } from "@client/components/ui/data-state"
import { EntityTableShell } from "@client/components/ui/entity-table-shell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table"
import { Badge } from "@client/components/ui/badge"
import { Button } from "@client/components/ui/button"
import { Select } from "@client/components/ui/select"
import { FilterBar } from "@client/components/ui/filter-bar"
import { FilterField } from "@client/components/ui/filter-field"
import { Navigate } from "react-router-dom"
import { cn } from "@client/lib/utils"
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid"

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 25

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function valuePreview(val: unknown): string {
  if (val == null) return ""
  if (typeof val === "string") return val.length > 40 ? val.slice(0, 40) + "…" : val
  if (typeof val === "number" || typeof val === "boolean") return String(val)
  try {
    const s = JSON.stringify(val)
    return s.length > 40 ? s.slice(0, 40) + "…" : s
  } catch {
    return ""
  }
}

function actorName(item: AuditLogItem): string {
  const a = item.actor
  if (!a) return ""
  return a.name?.trim() || a.email || ""
}

function actorKey(item: AuditLogItem): string {
  const a = item.actor
  if (!a) return ""
  return a.email ?? a.id ?? ""
}

export function AuditLogPage() {
  const { flags, loading: permissionsLoading } = usePermissions()
  const { data, isLoading, error } = useAuditLogAll({ limit: 300, enabled: !!flags.canViewAuditLog })

  const [filterModule, setFilterModule] = useState("")
  const [filterActor, setFilterActor] = useState("")
  const [filterField, setFilterField] = useState("")
  const [filterResource, setFilterResource] = useState("")
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState(1)

  const activities = data?.activities ?? []
  const isEmpty = !isLoading && !error && activities.length === 0

  const { uniqueModules, uniqueActors, uniqueFields, uniqueResources } = useMemo(() => {
    const modules = new Set<string>()
    const actors: Array<{ key: string; label: string }> = []
    const seenActorKeys = new Set<string>()
    const fields = new Set<string>()
    const resources = new Set<string>()
    activities.forEach((item) => {
      modules.add(item.module)
      const ak = actorKey(item)
      const al = actorName(item)
      if (ak && !seenActorKeys.has(ak)) {
        seenActorKeys.add(ak)
        actors.push({ key: ak, label: al || ak })
      }
      if (item.field_name) fields.add(item.field_name)
      resources.add(item.resource_type)
    })
    actors.sort((a, b) => (a.label || a.key).localeCompare(b.label || b.key))
    return {
      uniqueModules: Array.from(modules).sort(),
      uniqueActors: actors,
      uniqueFields: Array.from(fields).sort(),
      uniqueResources: Array.from(resources).sort(),
    }
  }, [activities])

  const filteredActivities = useMemo(() => {
    return activities.filter((item) => {
      if (filterModule && item.module !== filterModule) return false
      if (filterActor && actorKey(item) !== filterActor) return false
      if (filterField && (item.field_name ?? "") !== filterField) return false
      if (filterResource && item.resource_type !== filterResource) return false
      return true
    })
  }, [activities, filterModule, filterActor, filterField, filterResource])

  const totalFiltered = filteredActivities.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredActivities.slice(start, start + pageSize)
  }, [filteredActivities, currentPage, pageSize])

  const hasActiveFilters = !!(filterModule || filterActor || filterField || filterResource)
  const resetFilters = () => {
    setFilterModule("")
    setFilterActor("")
    setFilterField("")
    setFilterResource("")
    setPage(1)
  }

  useEffect(() => {
    setPage(1)
  }, [filterModule, filterActor, filterField, filterResource])

  if (permissionsLoading) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-8">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </PageLayout>
    )
  }

  if (!flags.canViewAuditLog) {
    return <Navigate to="/tickets" replace />
  }

  return (
    <PageLayout>
      <PageHeader title="Audit Log" />
      <DataState
        loading={isLoading}
        error={error?.message ?? null}
        isEmpty={isEmpty}
        emptyTitle="No audit entries yet"
        emptyDescription="Activity will appear here as changes are made."
      >
        <div className="space-y-4">
          <FilterBar
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
            filters={
              <>
                <FilterField label="Module" id="audit-filter-module">
                  <Select
                    id="audit-filter-module"
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                    className="min-w-[120px]"
                  >
                    <option value="">All</option>
                    {uniqueModules.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </FilterField>
                <FilterField label="Actor" id="audit-filter-actor">
                  <Select
                    id="audit-filter-actor"
                    value={filterActor}
                    onChange={(e) => setFilterActor(e.target.value)}
                    className="min-w-[140px]"
                  >
                    <option value="">All</option>
                    {uniqueActors.map(({ key, label }) => (
                      <option key={key} value={key}>
                        {label || key}
                      </option>
                    ))}
                  </Select>
                </FilterField>
                <FilterField label="Field" id="audit-filter-field">
                  <Select
                    id="audit-filter-field"
                    value={filterField}
                    onChange={(e) => setFilterField(e.target.value)}
                    className="min-w-[120px]"
                  >
                    <option value="">All</option>
                    {uniqueFields.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </Select>
                </FilterField>
                <FilterField label="Resource" id="audit-filter-resource">
                  <Select
                    id="audit-filter-resource"
                    value={filterResource}
                    onChange={(e) => setFilterResource(e.target.value)}
                    className="min-w-[120px]"
                  >
                    <option value="">All</option>
                    {uniqueResources.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </FilterField>
              </>
            }
          />
          <div className="overflow-x-auto">
            <EntityTableShell>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 py-2 text-xs whitespace-nowrap">Date</TableHead>
                    <TableHead className="h-9 py-2 text-xs whitespace-nowrap">Module</TableHead>
                    <TableHead className="h-9 py-2 text-xs whitespace-nowrap">Event</TableHead>
                    <TableHead className="h-9 py-2 text-xs whitespace-nowrap">Resource</TableHead>
                    <TableHead className="h-9 py-2 text-xs whitespace-nowrap">Actor</TableHead>
                    <TableHead className="h-9 py-2 text-xs whitespace-nowrap">Field</TableHead>
                    <TableHead className="h-9 py-2 text-xs whitespace-nowrap">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedActivities.map((item) => (
                    <TableRow key={item.id} className="align-top">
                      <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {item.module}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-sm">{item.event_type}</TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">
                        {item.resource_type}
                      </TableCell>
                      <TableCell className="py-2 text-sm">{actorName(item)}</TableCell>
                      <TableCell className={cn("py-2 text-xs text-muted-foreground", !item.field_name && "text-transparent select-none")}>
                        {item.field_name ?? "\u200b"}
                      </TableCell>
                      <TableCell className={cn("py-2 text-xs max-w-[200px]", item.field_name == null && "text-transparent select-none")}>
                        {item.field_name != null && (item.old_value != null || item.new_value != null) ? (
                          <span className="text-muted-foreground">
                            {valuePreview(item.old_value)} → {valuePreview(item.new_value)}
                          </span>
                        ) : (
                          "\u200b"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </EntityTableShell>
          </div>
          {totalFiltered > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="w-16"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
                <span className="text-sm text-muted-foreground">
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalFiltered)} of {totalFiltered}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <span className="min-w-[80px] text-center text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DataState>
    </PageLayout>
  )
}
