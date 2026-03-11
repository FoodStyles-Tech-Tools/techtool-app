"use client"

import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { usePermissions } from "@client/hooks/use-permissions"
import { useDepartments } from "@client/hooks/use-departments"
import { useProjects } from "@client/hooks/use-projects"
import { useEpics } from "@client/hooks/use-epics"
import { useSprints } from "@client/hooks/use-sprints"
import { useUsers } from "@client/hooks/use-users"
import { useUserEmail } from "@client/lib/supabase-context"
import { useOpenSubtasksDialog } from "@client/features/tickets/hooks/use-open-subtasks-dialog"
import { useTicketDetailActions } from "@client/features/tickets/hooks/use-ticket-detail-actions"
import { useTicketDetail } from "@client/features/tickets/hooks/use-ticket-detail"
import {
  useTickets,
  useUpdateTicket,
  useUpdateTicketWithReasonComment,
} from "@client/features/tickets/hooks/use-tickets"
import { ASSIGNEE_ALLOWED_ROLES, SQA_ALLOWED_ROLES } from "@shared/ticket-constants"

const NO_DEPARTMENT_VALUE = "no_department"
const NO_PROJECT_VALUE = "no_project"
const NO_PARENT_TICKET_VALUE = "no_parent_ticket"

type UseTicketDetailSurfaceOptions = {
  enabled?: boolean
}

export function useTicketDetailSurface(
  ticketId: string,
  options: UseTicketDetailSurfaceOptions = {}
) {
  const enabled = options.enabled ?? true
  const navigate = useNavigate()
  const { flags } = usePermissions()
  const canEditTickets = flags?.canEditTickets ?? false
  const { departments } = useDepartments({ realtime: false })
  const { data: projectsData } = useProjects({ realtime: false })
  const projects = useMemo(() => projectsData || [], [projectsData])
  const { openSubtasksDialog, askHowToHandleOpenSubtasks, resolveOpenSubtasksDialog } =
    useOpenSubtasksDialog()
  const { ticket, comments: detailComments, relations, isLoading } = useTicketDetail(
    ticketId || "",
    { enabled: !!ticketId && enabled }
  )
  const { data: relationTicketsData } = useTickets({
    enabled: !!ticketId && enabled,
    realtime: false,
    limit: 200,
    page: 1,
  })
  const { data: usersData } = useUsers({ realtime: false })
  const userEmail = useUserEmail()
  const updateTicket = useUpdateTicket()
  const updateTicketWithReasonComment = useUpdateTicketWithReasonComment()

  const currentUser = useMemo(() => {
    if (!userEmail || !usersData) return null
    const lower = userEmail.toLowerCase()
    return usersData.find((user) => user.email.toLowerCase() === lower) || null
  }, [usersData, userEmail])

  const projectId = ticket?.project?.id || ""
  const { epics } = useEpics(projectId)
  const { sprints } = useSprints(projectId)
  const users = useMemo(() => usersData || [], [usersData])

  const selectedParentTicketId = ticket?.parentTicketId || null
  const parentTicketOptions = useMemo(() => {
    const optionsMap = new Map<string, { id: string; displayId: string | null; title: string }>()

    ;(relationTicketsData || []).forEach((candidate) => {
      if (!candidate.id || candidate.id === ticketId) return
      if (candidate.type === "subtask") return
      optionsMap.set(candidate.id, {
        id: candidate.id,
        displayId: candidate.displayId || null,
        title: candidate.title || "Untitled ticket",
      })
    })

    if (
      relations?.parent?.id &&
      relations.parent.id !== ticketId &&
      relations.parent.type !== "subtask" &&
      !optionsMap.has(relations.parent.id)
    ) {
      optionsMap.set(relations.parent.id, {
        id: relations.parent.id,
        displayId: relations.parent.displayId || null,
        title: relations.parent.title || "Untitled ticket",
      })
    }

    return Array.from(optionsMap.values()).sort((left, right) => {
      const leftLabel = `${left.displayId || ""} ${left.title}`.trim().toLowerCase()
      const rightLabel = `${right.displayId || ""} ${right.title}`.trim().toLowerCase()
      return leftLabel.localeCompare(rightLabel)
    })
  }, [relationTicketsData, relations?.parent, ticketId])

  const selectedParentTicketOption = useMemo(() => {
    if (!selectedParentTicketId) return null
    return parentTicketOptions.find((c) => c.id === selectedParentTicketId) || null
  }, [parentTicketOptions, selectedParentTicketId])

  const parentNavigationSlug = useMemo(() => {
    const relationDisplayId = relations?.parent?.displayId
    if (relationDisplayId) return String(relationDisplayId).toLowerCase()
    const optionDisplayId = selectedParentTicketOption?.displayId
    if (optionDisplayId) return String(optionDisplayId).toLowerCase()
    return null
  }, [relations?.parent?.displayId, selectedParentTicketOption?.displayId])

  const loading = !ticket && isLoading
  const isAssignmentLocked = !!ticket && !ticket.assignee
  const isSqaUser = (currentUser?.role || "").toLowerCase() === "sqa"
  const currentTicketSqaAssigneeId = ticket?.sqaAssignee?.id || null
  const isSqaEditLocked =
    !!ticket && isSqaUser && !!currentUser?.id && currentTicketSqaAssigneeId !== currentUser.id

  const assigneeEligibleUsers = useMemo(
    () => users.filter((u) => (u.role ? ASSIGNEE_ALLOWED_ROLES.has(u.role.toLowerCase()) : false)),
    [users]
  )
  const sqaEligibleUsers = useMemo(
    () => users.filter((u) => (u.role ? SQA_ALLOWED_ROLES.has(u.role.toLowerCase()) : false)),
    [users]
  )

  const actions = useTicketDetailActions({
    ticketId,
    open: enabled,
    ticket,
    canEditTickets,
    isAssignmentLocked,
    isSqaEditLocked,
    currentUserId: currentUser?.id,
    askHowToHandleOpenSubtasks,
    updateTicket,
    updateTicketWithReasonComment,
  })

  const projectOptions = useMemo(() => {
    const selectedProjectId = ticket?.project?.id
    const visibleProjects = projects.filter(
      (project) =>
        project.status?.toLowerCase() !== "inactive" || project.id === selectedProjectId
    )

    return [...visibleProjects].sort((left, right) =>
      (left.name || "").localeCompare(right.name || "", undefined, { sensitivity: "base" })
    )
  }, [projects, ticket?.project?.id])

  const handleGoToParentTicket = () => {
    if (!parentNavigationSlug) return
    navigate(`/tickets/${parentNavigationSlug}`)
  }

  return {
    ticketId,
    ticket,
    detailComments,
    relations,
    loading,

    canEditTickets,
    isAssignmentLocked,
    isSqaEditLocked,
    actions,

    currentUser,
    users,
    assigneeEligibleUsers,
    sqaEligibleUsers,
    departments,
    epics,
    sprints,
    projectOptions,
    parentTicketOptions,
    selectedParentTicketId,
    selectedParentTicketOption,
    parentNavigationSlug,

    openSubtasksDialog,
    resolveOpenSubtasksDialog,

    navigate,
    handleGoToParentTicket,

    NO_DEPARTMENT_VALUE,
    NO_PROJECT_VALUE,
    NO_PARENT_TICKET_VALUE,
  }
}

export type TicketDetailSurface = ReturnType<typeof useTicketDetailSurface>
