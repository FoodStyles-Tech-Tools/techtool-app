"use client"

import { useState, useCallback, useMemo, useEffect, useDeferredValue } from "react"
import { isDoneStatus } from "@/lib/ticket-statuses"

export interface TicketStatusOption {
  id: string
  label: string
  color: string
}

export interface ProjectsFilterOption {
  id: string
  name: string
  status?: string | null
}

interface UseTicketsFiltersOptions {
  user: { id: string; role?: string | null } | null
  preferencesView?: "table" | "kanban" | null
  projects: ProjectsFilterOption[]
}

export function useTicketsFilters({
  user,
  preferencesView,
  projects,
}: UseTicketsFiltersOptions) {
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [includeInactiveProjects, setIncludeInactiveProjects] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [requestedByFilter, setRequestedByFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [excludeDone, setExcludeDone] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [view, setView] = useState<"table" | "kanban">(preferencesView || "table")

  // Sync view from preferences
  useEffect(() => {
    if (preferencesView) {
      setView(preferencesView)
    }
  }, [preferencesView])

  // Default assignee/requestedBy by role (run once when user is ready)
  useEffect(() => {
    if (!user?.id || !user?.role) return
    const userRole = user.role.toLowerCase()
    const isAdminOrMember = userRole === "admin" || userRole === "member"
    if (!isAdminOrMember) {
      setRequestedByFilter((prev) => (prev === "all" ? user.id : prev))
    } else {
      setAssigneeFilter((prev) => (prev === "all" ? user.id : prev))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role])

  // Reset status filter when excludeDone is on and current status is done
  useEffect(() => {
    if (excludeDone && statusFilter !== "all" && isDoneStatus(statusFilter)) {
      setStatusFilter("all")
    }
  }, [excludeDone, statusFilter])

  // Clear project filter if selected project becomes inactive (unless including inactive)
  useEffect(() => {
    if (includeInactiveProjects || projectFilter === "all") return
    const selected = projects.find((p) => p.id === projectFilter)
    if (selected?.status?.toLowerCase() === "inactive") {
      setProjectFilter("all")
    }
  }, [includeInactiveProjects, projectFilter, projects])

  const resetPage = useCallback(() => setCurrentPage(1), [])

  const setStatusFilterAndResetPage = useCallback((value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }, [])
  const setProjectFilterAndResetPage = useCallback((value: string) => {
    setProjectFilter(value)
    setCurrentPage(1)
  }, [])
  const setDepartmentFilterAndResetPage = useCallback((value: string) => {
    setDepartmentFilter(value)
    setCurrentPage(1)
  }, [])
  const setRequestedByFilterAndResetPage = useCallback((value: string) => {
    setRequestedByFilter(value)
    setCurrentPage(1)
  }, [])
  const setAssigneeFilterAndResetPage = useCallback((value: string) => {
    setAssigneeFilter(value)
    setCurrentPage(1)
  }, [])
  const setExcludeDoneAndResetPage = useCallback((value: boolean) => {
    setExcludeDone(value)
    setCurrentPage(1)
  }, [])

  const resetToolbarFilters = useCallback(() => {
    setSearchQuery("")
    setStatusFilter("all")
    setDepartmentFilter("all")
    setRequestedByFilter("all")
    setProjectFilter("all")
    setAssigneeFilter("all")
    setExcludeDone(true)
    setCurrentPage(1)
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count += 1
    if (statusFilter !== "all") count += 1
    if (projectFilter !== "all") count += 1
    if (departmentFilter !== "all") count += 1
    if (requestedByFilter !== "all") count += 1
    if (assigneeFilter !== "all") count += 1
    if (!excludeDone) count += 1
    return count
  }, [
    searchQuery,
    statusFilter,
    projectFilter,
    departmentFilter,
    requestedByFilter,
    assigneeFilter,
    excludeDone,
  ])

  const selectedProjectLabel = useMemo(() => {
    if (projectFilter === "all") return "All Projects"
    return projects.find((p) => p.id === projectFilter)?.name || "Project"
  }, [projectFilter, projects])

  return {
    searchQuery,
    setSearchQuery,
    deferredSearchQuery,
    statusFilter,
    setStatusFilter: setStatusFilterAndResetPage,
    projectFilter,
    setProjectFilter: setProjectFilterAndResetPage,
    includeInactiveProjects,
    setIncludeInactiveProjects,
    departmentFilter,
    setDepartmentFilter: setDepartmentFilterAndResetPage,
    requestedByFilter,
    setRequestedByFilter: setRequestedByFilterAndResetPage,
    assigneeFilter,
    setAssigneeFilter: setAssigneeFilterAndResetPage,
    excludeDone,
    setExcludeDone: setExcludeDoneAndResetPage,
    currentPage,
    setCurrentPage,
    resetPage,
    view,
    setView,
    resetToolbarFilters,
    activeFilterCount,
    selectedProjectLabel,
  }
}
