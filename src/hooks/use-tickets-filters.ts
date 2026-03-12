"use client"

import { useState, useCallback, useMemo, useEffect, useDeferredValue } from "react"
import { isDoneStatus } from "@shared/ticket-statuses"

export interface ProjectsFilterOption {
  id: string
  name: string
  status?: string | null
}

interface UseTicketsFiltersOptions {
  user: { id: string; role?: string | null } | null
  projects: ProjectsFilterOption[]
  initialProjectId?: string | null
}

export function useTicketsFilters({
  user,
  projects,
  initialProjectId,
}: UseTicketsFiltersOptions) {
  const [searchQuery, setSearchQuery] = useState("")
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId ?? "all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [requestedByFilter, setRequestedByFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [sqaFilter, setSqaFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [epicFilter, setEpicFilter] = useState<string>("all")
  const [sprintFilter, setSprintFilter] = useState<string>("all")
  const [excludeDone, setExcludeDone] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

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
     
  }, [user?.id, user?.role])

  // Reset status filter when excludeDone is on and current status is done
  useEffect(() => {
    if (excludeDone && statusFilter !== "all" && isDoneStatus(statusFilter)) {
      setStatusFilter("all")
    }
  }, [excludeDone, statusFilter])

  // Clear project filter if selected project becomes inactive (unless including inactive)
  useEffect(() => {
    if (projectFilter === "all") return
    const selected = projects.find((p) => p.id === projectFilter)
    if (selected?.status?.toLowerCase() === "inactive") {
      setProjectFilter("all")
    }
  }, [projectFilter, projects])

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
  const setSqaFilterAndResetPage = useCallback((value: string) => {
    setSqaFilter(value)
    setCurrentPage(1)
  }, [])
  const setPriorityFilterAndResetPage = useCallback((value: string) => {
    setPriorityFilter(value)
    setCurrentPage(1)
  }, [])
  const setEpicFilterAndResetPage = useCallback((value: string) => {
    setEpicFilter(value)
    setCurrentPage(1)
  }, [])
  const setSprintFilterAndResetPage = useCallback((value: string) => {
    setSprintFilter(value)
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
    setSqaFilter("all")
    setPriorityFilter("all")
    setEpicFilter("all")
    setSprintFilter("all")
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
    if (sqaFilter !== "all") count += 1
    if (priorityFilter !== "all") count += 1
    if (epicFilter !== "all") count += 1
    if (sprintFilter !== "all") count += 1
    if (!excludeDone) count += 1
    return count
  }, [
    searchQuery,
    statusFilter,
    projectFilter,
    departmentFilter,
    requestedByFilter,
    assigneeFilter,
    sqaFilter,
    priorityFilter,
    epicFilter,
    sprintFilter,
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
    departmentFilter,
    setDepartmentFilter: setDepartmentFilterAndResetPage,
    requestedByFilter,
    setRequestedByFilter: setRequestedByFilterAndResetPage,
    assigneeFilter,
    setAssigneeFilter: setAssigneeFilterAndResetPage,
    sqaFilter,
    setSqaFilter: setSqaFilterAndResetPage,
    priorityFilter,
    setPriorityFilter: setPriorityFilterAndResetPage,
    epicFilter,
    setEpicFilter: setEpicFilterAndResetPage,
    sprintFilter,
    setSprintFilter: setSprintFilterAndResetPage,
    excludeDone,
    setExcludeDone: setExcludeDoneAndResetPage,
    currentPage,
    setCurrentPage,
    resetPage,
    resetToolbarFilters,
    activeFilterCount,
    selectedProjectLabel,
  }
}
