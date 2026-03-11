"use client"

import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { usePermissions } from "@/hooks/use-permissions"
import { useDepartments } from "@/hooks/use-departments"
import { useProjects } from "@/hooks/use-projects"
import { useEpics } from "@/hooks/use-epics"
import { useSprints } from "@/hooks/use-sprints"
import { useUsers } from "@/hooks/use-users"
import { useUserEmail } from "@/lib/supabase-context"
import { useOpenSubtasksDialog } from "@/features/tickets/hooks/use-open-subtasks-dialog"
import { useTicketDetailActions } from "@/features/tickets/hooks/use-ticket-detail-actions"
import { useTicketDetail } from "@/features/tickets/hooks/use-ticket-detail"
import {
  useTickets,
  useUpdateTicket,
  useUpdateTicketWithReasonComment,
} from "@/features/tickets/hooks/use-tickets"
import { TicketDetailDialogs } from "@/features/tickets/components/ticket-detail-dialogs"
import { TicketDetailHeader } from "@/features/tickets/components/ticket-detail-header"
import { TicketDetailMainColumn } from "@/features/tickets/components/ticket-detail-main-column"
import { TicketDetailSidebar } from "@/features/tickets/components/ticket-detail-sidebar"
import { PageLayout } from "@/components/ui/page-layout"
import { DataState } from "@/components/ui/data-state"
import { ASSIGNEE_ALLOWED_ROLES, SQA_ALLOWED_ROLES } from "@/lib/ticket-constants"

const NO_DEPARTMENT_VALUE = "no_department"
const NO_PROJECT_VALUE = "no_project"
const NO_PARENT_TICKET_VALUE = "no_parent_ticket"

type TicketDetailPageClientProps = {
  ticketId: string
}

export function TicketDetailPageClient({ ticketId }: TicketDetailPageClientProps) {
  const navigate = useNavigate()
  const { flags } = usePermissions()
  const canEditTickets = flags?.canEditTickets ?? false
  const { departments } = useDepartments({ realtime: false })
  const { data: projectsData } = useProjects({ realtime: false })
  const projects = useMemo(() => projectsData || [], [projectsData])
  const { openSubtasksDialog, askHowToHandleOpenSubtasks, resolveOpenSubtasksDialog } =
    useOpenSubtasksDialog()
  const { ticket, comments: detailComments, relations, isLoading } = useTicketDetail(ticketId || "", {
    enabled: !!ticketId,
  })
  const { data: relationTicketsData } = useTickets({
    enabled: !!ticketId,
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
    return parentTicketOptions.find((candidate) => candidate.id === selectedParentTicketId) || null
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
    () => users.filter((user) => (user.role ? ASSIGNEE_ALLOWED_ROLES.has(user.role.toLowerCase()) : false)),
    [users]
  )
  const sqaEligibleUsers = useMemo(
    () => users.filter((user) => (user.role ? SQA_ALLOWED_ROLES.has(user.role.toLowerCase()) : false)),
    [users]
  )

  const actions = useTicketDetailActions({
    ticketId,
    open: true,
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

  if (!ticketId) return null

  return (
    <>
      <PageLayout>
      <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col gap-4">
        <TicketDetailHeader
          ticketId={ticketId}
          ticket={ticket}
          parentNavigationSlug={parentNavigationSlug}
          canEditTickets={canEditTickets}
          isAssignmentLocked={isAssignmentLocked}
          isUpdatingStatus={!!actions.updatingFields.status}
          isEditingTitle={actions.isEditingTitle}
          titleValue={actions.titleValue}
          onTitleValueChange={actions.setTitleValue}
          onTitleSave={actions.handleTitleSave}
          onTitleKeyDown={actions.handleTitleKeyDown}
          onStartTitleEdit={() => actions.setIsEditingTitle(true)}
          onBackToTickets={() => navigate("/tickets")}
          onGoToParentTicket={handleGoToParentTicket}
          onCopyTicketLabel={actions.handleCopyTicketLabel}
          onCopyShareUrl={actions.handleCopyShareUrl}
          onCopyHyperlinkedUrl={actions.handleCopyHyperlinkedUrl}
          onRequestDelete={actions.openDeleteDialog}
          onStatusChange={(status) => {
            void actions.handleStatusChange(status)
          }}
        />

        <div className="flex-1 overflow-y-auto">
          <DataState
            loading={loading}
            isEmpty={!loading && !ticket}
            loadingTitle="Loading ticket"
            loadingDescription="The ticket details are being prepared."
            emptyTitle="Ticket not found"
            emptyDescription="The requested ticket could not be loaded."
          >
            {ticket ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_minmax(280px,340px)]">
                <TicketDetailMainColumn
                  ticketId={ticketId}
                  ticket={ticket}
                  canEditTickets={canEditTickets}
                  detailComments={detailComments}
                  isEditingDescription={actions.isEditingDescription}
                  descriptionValue={actions.descriptionValue}
                  onDescriptionValueChange={actions.setDescriptionValue}
                  onDescriptionSave={actions.handleDescriptionSave}
                  onCancelDescriptionEdit={() => {
                    actions.setDescriptionValue(ticket.description || "")
                    actions.setIsEditingDescription(false)
                  }}
                  onStartDescriptionEdit={() => actions.setIsEditingDescription(true)}
                  isAddingLink={actions.isAddingLink}
                  onStartAddLink={() => {
                    actions.setIsAddingLink(true)
                    actions.setNewLinkUrl("")
                  }}
                  onCancelAddLink={() => {
                    actions.setIsAddingLink(false)
                    actions.setNewLinkUrl("")
                  }}
                  newLinkUrl={actions.newLinkUrl}
                  onNewLinkUrlChange={actions.setNewLinkUrl}
                  onAddLink={actions.handleAddLink}
                  editingLinkIndex={actions.editingLinkIndex}
                  onStartEditLink={(index, url) => {
                    actions.setEditingLinkIndex(index)
                    actions.setNewLinkUrl(url)
                  }}
                  onCancelEditLink={() => {
                    actions.setEditingLinkIndex(null)
                    actions.setNewLinkUrl("")
                  }}
                  onUpdateLink={actions.handleUpdateLink}
                  onRemoveLink={actions.handleRemoveLink}
                  isSubtasksCollapsed={actions.isSubtasksCollapsed}
                  onToggleSubtasks={() =>
                    actions.setIsSubtasksCollapsed((previous) => !previous)
                  }
                  subtasksPanelId={`ticket-subtasks-panel-${ticketId}`}
                />

                <TicketDetailSidebar
                  ticket={ticket}
                  canEditTickets={canEditTickets}
                  isAssignmentLocked={isAssignmentLocked}
                  isSqaEditLocked={isSqaEditLocked}
                  updatingFields={actions.updatingFields}
                  currentUser={currentUser}
                  users={users}
                  assigneeEligibleUsers={assigneeEligibleUsers}
                  sqaEligibleUsers={sqaEligibleUsers}
                  departments={departments}
                  epics={epics}
                  sprints={sprints}
                  projectOptions={projectOptions}
                  relations={relations}
                  parentTicketOptions={parentTicketOptions}
                  selectedParentTicketId={selectedParentTicketId}
                  selectedParentTicketOption={selectedParentTicketOption}
                  parentNavigationSlug={parentNavigationSlug}
                  timestampValidation={actions.timestampValidation}
                  parseTimestamp={actions.parseTimestamp}
                  getTimestampWarningMessage={actions.getTimestampWarningMessage}
                  onAssigneeChange={actions.handleAssigneeChange}
                  onRequestedByChange={actions.handleRequestedByChange}
                  onSqaAssigneeChange={actions.handleSqaAssigneeChange}
                  onTypeChange={actions.handleTypeChange}
                  onParentTicketChange={(nextParentTicketId) =>
                    void actions.handleParentTicketChange(nextParentTicketId, NO_PARENT_TICKET_VALUE)
                  }
                  onPriorityChange={actions.handlePriorityChange}
                  onDueDateChange={actions.handleDueDateChange}
                  onDepartmentChange={(nextDepartmentId) =>
                    actions.handleDepartmentChange(nextDepartmentId, NO_DEPARTMENT_VALUE)
                  }
                  onEpicChange={actions.handleEpicChange}
                  onSprintChange={actions.handleSprintChange}
                  onProjectChange={(nextProjectId) =>
                    actions.handleProjectChange(nextProjectId, NO_PROJECT_VALUE)
                  }
                  onTimestampChange={(field, value) =>
                    void actions.handleTimestampChange(field, value)
                  }
                />
              </div>
            ) : null}
          </DataState>
        </div>
      </div>
      </PageLayout>

      <TicketDetailDialogs
        canEditTickets={canEditTickets}
        showCancelReasonDialog={actions.showCancelReasonDialog}
        pendingStatusChange={actions.pendingStatusChange}
        cancelReason={actions.cancelReason}
        onCancelReasonChange={actions.setCancelReason}
        onCancelReasonClose={actions.closeCancelReasonDialog}
        onCancelReasonConfirm={() => {
          void actions.handleCancelReasonSubmit()
        }}
        showDeleteReasonDialog={actions.showDeleteReasonDialog}
        deleteReason={actions.deleteReason}
        onDeleteReasonChange={actions.setDeleteReason}
        onDeleteReasonClose={actions.closeDeleteReasonDialog}
        onDeleteReasonConfirm={() => {
          void actions.handleDeleteReasonSubmit()
        }}
        showReturnedReasonDialog={actions.showReturnedReasonDialog}
        returnedReason={actions.returnedReason}
        onReturnedReasonChange={actions.setReturnedReason}
        onReturnedReasonClose={actions.closeReturnedReasonDialog}
        onReturnedReasonConfirm={() => {
          void actions.handleReturnedReasonSubmit()
        }}
        openSubtasksDialog={openSubtasksDialog}
        onSubtasksCancel={() => resolveOpenSubtasksDialog("cancel")}
        onSubtasksKeepOpen={() => resolveOpenSubtasksDialog("keep_open")}
        onSubtasksCloseAll={() => resolveOpenSubtasksDialog("close_all")}
      />
    </>
  )
}


