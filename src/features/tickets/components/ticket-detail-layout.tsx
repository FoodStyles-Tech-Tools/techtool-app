"use client"

import { DataState } from "@client/components/ui/data-state"
import { cn } from "@client/lib/utils"
import { Input } from "@client/components/ui/input"
import { TicketStatusSelect } from "@client/components/ticket-status-select"
import { TicketDetailHeader } from "@client/features/tickets/components/ticket-detail-header"
import { TicketDetailMainColumn } from "@client/features/tickets/components/ticket-detail-main-column"
import { TicketDetailSidebar } from "@client/features/tickets/components/ticket-detail-sidebar"
import { TicketDetailDialogs } from "@client/features/tickets/components/ticket-detail-dialogs"
import type { TicketDetailSurface } from "@client/features/tickets/hooks/use-ticket-detail-surface"
import { useDeployRounds } from "@client/features/projects/hooks/use-deploy-rounds"

type TicketDetailLayoutProps = {
  surface: TicketDetailSurface
  onBackToTickets: () => void
  showHeader?: boolean
}

export function TicketDetailLayout({ surface, onBackToTickets, showHeader = true }: TicketDetailLayoutProps) {
  const {
    ticketId,
    ticket,
    detailComments,
    relations,
    loading,
    isArchivedTicket,
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
    parentNavigationSlug,
    openSubtasksDialog,
    resolveOpenSubtasksDialog,
    NO_DEPARTMENT_VALUE,
    NO_PROJECT_VALUE,
    NO_PARENT_TICKET_VALUE,
  } = surface
  const isTicketUnassigned = !ticket?.assignee?.id

  const projectIdForDeployRounds = ticket?.project?.id ?? null
  const { data: deployRounds = [] } = useDeployRounds(projectIdForDeployRounds || "", {
    enabled: !!projectIdForDeployRounds,
  })

  const gridContent = (
    <DataState
      loading={loading}
      isEmpty={!loading && !ticket}
      loadingTitle="Loading ticket"
      loadingDescription="The ticket details are being prepared."
      emptyTitle="Ticket not found"
      emptyDescription="The requested ticket could not be loaded."
    >
      {ticket ? (
        <div className="space-y-4">
          {!showHeader ? (
            <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,360px)]">
              <div className="min-w-0">
                {actions.isEditingTitle ? (
                  <Input
                    value={actions.titleValue}
                    onChange={(event) => actions.setTitleValue(event.target.value)}
                    onBlur={() => void actions.handleTitleSave()}
                    onKeyDown={actions.handleTitleKeyDown}
                    className="h-8 text-base font-semibold"
                    disabled={!canEditTickets}
                    autoFocus
                  />
                ) : (
                  <h1
                    className={cn(
                      "text-base font-semibold leading-tight text-foreground",
                      canEditTickets && "cursor-pointer rounded-md px-1 py-1 hover:bg-accent"
                    )}
                    onClick={() => {
                      if (canEditTickets) {
                        actions.setIsEditingTitle(true)
                      }
                    }}
                  >
                    {ticket.title || "Untitled ticket"}
                  </h1>
                )}
              </div>
              <div className="flex justify-start">
                {isArchivedTicket ? (
                  <span className="flex h-8 items-center text-sm font-medium text-muted-foreground">Archived</span>
                ) : (
                  <TicketStatusSelect
                    value={ticket.status}
                    onValueChange={(status) => actions.handleStatusChange(status)}
                    disabled={
                      isTicketUnassigned ||
                      !canEditTickets ||
                      isAssignmentLocked ||
                      !!actions.updatingFields.status
                    }
                    hideNativeSelect={isTicketUnassigned}
                    allowSqaStatuses={ticket.project?.require_sqa === true}
                    triggerClassName="h-8"
                    isLoading={!!actions.updatingFields.status}
                  />
                )}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,360px)]">
            <div className="space-y-4">
              <TicketDetailMainColumn
                ticketId={ticketId}
                ticket={ticket}
                canEditTickets={canEditTickets}
                detailComments={detailComments}
                relations={relations}
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
              />
            </div>

            <div className="space-y-4">
              <TicketDetailSidebar
                hideStatusRow={!showHeader}
                isArchivedTicket={isArchivedTicket}
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
                parseTimestamp={actions.parseTimestamp}
                deployRounds={deployRounds}
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
                onStatusChange={(status) => actions.handleStatusChange(status)}
                onDeployRoundChange={actions.handleDeployRoundChange}
              />
            </div>
          </div>
        </div>
      ) : null}
    </DataState>
  )

  return (
    <>
      {showHeader ? (
        <>
          <TicketDetailHeader
            ticketId={ticketId}
            ticket={ticket}
            canEditTickets={canEditTickets}
            isAssignmentLocked={isAssignmentLocked}
            isEditingTitle={actions.isEditingTitle}
            titleValue={actions.titleValue}
            onTitleValueChange={actions.setTitleValue}
            onTitleSave={actions.handleTitleSave}
            onTitleKeyDown={actions.handleTitleKeyDown}
            onStartTitleEdit={() => actions.setIsEditingTitle(true)}
            onCopyTicketLabel={actions.handleCopyTicketLabel}
            onCopyShareUrl={actions.handleCopyShareUrl}
            onCopyHyperlinkedUrl={actions.handleCopyHyperlinkedUrl}
            onRequestDelete={actions.openDeleteDialog}
          />
          <div className="flex-1 overflow-y-auto">{gridContent}</div>
        </>
      ) : (
        gridContent
      )}

      <TicketDetailDialogs
        openSubtasksDialog={openSubtasksDialog}
        onSubtasksCancel={() => resolveOpenSubtasksDialog("cancel")}
        onSubtasksKeepOpen={() => resolveOpenSubtasksDialog("keep_open")}
        onSubtasksCloseAll={() => resolveOpenSubtasksDialog("close_all")}
        isDeleteDialogOpen={actions.isDeleteDialogOpen}
        onDeleteCancel={() => actions.setIsDeleteDialogOpen(false)}
        onDeleteConfirm={actions.confirmDelete}
      />
    </>
  )
}
