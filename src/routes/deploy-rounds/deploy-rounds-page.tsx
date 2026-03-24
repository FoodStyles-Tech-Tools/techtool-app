"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { requestJson } from "@client/lib/api"
import { fetchDeployRounds } from "@client/features/projects/lib/deploy-rounds-client"
import { PageLayout } from "@client/components/ui/page-layout"
import { PageHeader } from "@client/components/ui/page-header"
import { FilterBar } from "@client/components/ui/filter-bar"
import { FilterField } from "@client/components/ui/filter-field"
import { Input } from "@client/components/ui/input"
import { DataState } from "@client/components/ui/data-state"
import { EntityTableShell } from "@client/components/ui/entity-table-shell"
import { Button } from "@client/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table"
import type { ProjectsResponseDto } from "@shared/types/api/projects"

const ROWS_PER_PAGE = 20
const PROJECTS_PAGE_SIZE = 100
const MAX_PROJECT_PAGES = 50

type DeployRoundRow = {
  id: string
  projectId: string
  projectName: string
  deployRoundName: string
  createdAt: string
  totalTickets: number
  checklistCompleted: number
  checklistTotal: number
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

async function fetchAllProjects() {
  const projects: ProjectsResponseDto["projects"] = []
  let page = 1

  while (page <= MAX_PROJECT_PAGES) {
    const response = await requestJson<ProjectsResponseDto>(
      `/api/projects?limit=${PROJECTS_PAGE_SIZE}&page=${page}`
    )
    const chunk = response.projects || []
    projects.push(...chunk)
    if (chunk.length < PROJECTS_PAGE_SIZE) break
    page += 1
  }

  return projects
}

async function fetchDeployRoundRows(): Promise<DeployRoundRow[]> {
  const projects = await fetchAllProjects()
  const rowsByProject = await Promise.all(
    projects.map(async (project) => {
      const deployRounds = await fetchDeployRounds(project.id)
      return deployRounds.map((deployRound) => {
        const checklistTotal = deployRound.checklist.length
        const checklistCompleted = deployRound.checklist.filter((item) => item.completed).length
        return {
          id: deployRound.id,
          projectId: project.id,
          projectName: project.name,
          deployRoundName: deployRound.name,
          createdAt: deployRound.createdAt,
          totalTickets: deployRound.ticketCount ?? 0,
          checklistCompleted,
          checklistTotal,
        }
      })
    })
  )
  return rowsByProject
    .flat()
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt)
      const rightTime = Date.parse(right.createdAt)
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
        return rightTime - leftTime
      }
      return left.deployRoundName.localeCompare(right.deployRoundName, undefined, {
        sensitivity: "base",
      })
    })
}

export function DeployRoundsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const {
    data: deployRoundRows = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["deploy-rounds", "overview"],
    queryFn: fetchDeployRoundRows,
    staleTime: 30 * 1000,
  })

  const filteredRows = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase()
    if (!query) return deployRoundRows
    return deployRoundRows.filter((row) => {
      return (
        row.deployRoundName.toLowerCase().includes(query) ||
        row.projectName.toLowerCase().includes(query)
      )
    })
  }, [deferredSearchQuery, deployRoundRows])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE))
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedRows = filteredRows.slice(startIndex, endIndex)

  return (
    <PageLayout>
      <PageHeader title="Deploy Round" />

      <FilterBar
        hasActiveFilters={searchQuery.trim() !== ""}
        onResetFilters={() => {
          setSearchQuery("")
          setCurrentPage(1)
        }}
        filters={
          <FilterField label="Search" id="deploy-rounds-search">
            <div className="w-full min-w-[220px] md:w-96">
              <Input
                id="deploy-rounds-search"
                placeholder="Search by deploy round or project"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </FilterField>
        }
      />

      <DataState
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        isEmpty={!isLoading && filteredRows.length === 0}
        emptyTitle="No deploy rounds found"
        emptyDescription="Try changing the search keyword."
      >
        <EntityTableShell
          footer={
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredRows.length === 0 ? 0 : startIndex + 1} to{" "}
                {Math.min(endIndex, filteredRows.length)} of {filteredRows.length} deploy rounds
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 py-2">Deploy Round</TableHead>
                <TableHead className="h-9 py-2">Project</TableHead>
                <TableHead className="h-9 py-2">Created By</TableHead>
                <TableHead className="h-9 py-2">Created At</TableHead>
                <TableHead className="h-9 py-2">Total Ticket</TableHead>
                <TableHead className="h-9 py-2">Checklist Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.map((row) => {
                const checklistLabel =
                  row.checklistTotal > 0
                    ? `${row.checklistCompleted} / ${row.checklistTotal} completed`
                    : "No checklist"

                return (
                  <TableRow key={row.id}>
                    <TableCell className="py-2">
                      <Link
                        to={`/projects/${row.projectId}?deployRoundId=${encodeURIComponent(row.id)}&view=table`}
                        className="font-normal text-primary underline"
                      >
                        {row.deployRoundName}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2 text-sm text-foreground">{row.projectName}</TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground">-</TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-foreground">{row.totalTickets}</TableCell>
                    <TableCell className="py-2 text-sm text-foreground">{checklistLabel}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </EntityTableShell>
      </DataState>
    </PageLayout>
  )
}

