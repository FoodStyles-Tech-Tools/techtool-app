"use client"

import { useState, useCallback, useMemo, useEffect, useDeferredValue } from "react"

export interface ProjectsFilterOption {
  id: string
  name: string
  status?: string | null
}

/** Default statuses excluded from the list (unchecked in Status multi-select). Archived is hidden by default. */
export const DEFAULT_EXCLUDED_STATUSES = ["cancelled", "completed", "archived"]

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
  const [excludedStatuses, setExcludedStatuses] = useState<string[]>(() => [...DEFAULT_EXCLUDED_STATUSES])
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId ?? "all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [requestedByFilter, setRequestedByFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [sqaFilter, setSqaFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [epicFilter, setEpicFilter] = useState<string>("all")
  const [sprintFilter, setSprintFilter] = useState<string>("all")
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

  // Clear project filter if selected project becomes inactive (unless including inactive)
  useEffect(() => {
    if (projectFilter === "all") return
    const selected = projects.find((p) => p.id === projectFilter)
    if (selected?.status?.toLowerCase() === "inactive") {
      setProjectFilter("all")
    }
  }, [projectFilter, projects])

  const resetPage = useCallback(() => setCurrentPage(1), [])

  // Default assignee/requestedBy by role — same as "first load" so Reset restores session default
  const defaultAssignee = useMemo(() => {
    if (!user?.id || !user?.role) return "all"
    const userRole = user.role.toLowerCase()
    return userRole === "admin" || userRole === "member" ? user.id : "all"
  }, [user?.id, user?.role])
  const defaultRequestedBy = useMemo(() => {
    if (!user?.id || !user?.role) return "all"
    const userRole = user.role.toLowerCase()
    return userRole === "admin" || userRole === "member" ? "all" : user.id
  }, [user?.id, user?.role])

  const resetToolbarFilters = useCallback(() => {
    setSearchQuery("")
    setExcludedStatuses([...DEFAULT_EXCLUDED_STATUSES])
    setDepartmentFilter("all")
    setRequestedByFilter(defaultRequestedBy)
    setProjectFilter(initialProjectId ?? "all")
    setAssigneeFilter(defaultAssignee)
    setSqaFilter("all")
    setPriorityFilter("all")
    setTypeFilter("all")
    setEpicFilter("all")
    setSprintFilter("all")
    setCurrentPage(1)
  }, [defaultAssignee, defaultRequestedBy, initialProjectId])

  const toggleStatusExcluded = useCallback((statusKey: string) => {
    const key = statusKey.trim().toLowerCase()
    setExcludedStatuses((prev) => {
      const next = prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
      return next
    })
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
  const setTypeFilterAndResetPage = useCallback((value: string) => {
    setTypeFilter(value)
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
  const defaultProject = initialProjectId ?? "all"

  const defaultExcludedSet = useMemo(() => new Set(DEFAULT_EXCLUDED_STATUSES), [])

  // Active = differs from session default (what user had on first load)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count += 1
    const excludedSet = new Set(excludedStatuses)
    if (
      excludedSet.size !== defaultExcludedSet.size ||
      [...excludedSet].some((s) => !defaultExcludedSet.has(s))
    ) {
      count += 1
    }
    if (projectFilter !== defaultProject) count += 1
    if (departmentFilter !== "all") count += 1
    if (requestedByFilter !== defaultRequestedBy) count += 1
    if (assigneeFilter !== defaultAssignee) count += 1
    if (sqaFilter !== "all") count += 1
    if (priorityFilter !== "all") count += 1
    if (typeFilter !== "all") count += 1
    if (epicFilter !== "all") count += 1
    if (sprintFilter !== "all") count += 1
    return count
  }, [
    searchQuery,
    excludedStatuses,
    defaultExcludedSet,
    projectFilter,
    defaultProject,
    departmentFilter,
    requestedByFilter,
    defaultRequestedBy,
    assigneeFilter,
    defaultAssignee,
    sqaFilter,
    priorityFilter,
    typeFilter,
    epicFilter,
    sprintFilter,
  ])

  const hasActiveFilters = activeFilterCount > 0

  const selectedProjectLabel = useMemo(() => {
    if (projectFilter === "all") return "All Projects"
    return projects.find((p) => p.id === projectFilter)?.name || "Project"
  }, [projectFilter, projects])

  return {
    searchQuery,
    setSearchQuery,
    deferredSearchQuery,
    excludedStatuses,
    toggleStatusExcluded,
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
    typeFilter,
    setTypeFilter: setTypeFilterAndResetPage,
    epicFilter,
    setEpicFilter: setEpicFilterAndResetPage,
    sprintFilter,
    setSprintFilter: setSprintFilterAndResetPage,
    currentPage,
    setCurrentPage,
    resetPage,
    resetToolbarFilters,
    activeFilterCount,
    hasActiveFilters,
    selectedProjectLabel,
  }
}
