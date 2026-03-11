"use client"

import { Card } from "@client/components/ui/card"
import { DataState } from "@client/components/ui/data-state"
import { TicketDetailHeader } from "@client/features/tickets/components/ticket-detail-header"
import { TicketDetailMainColumn } from "@client/features/tickets/components/ticket-detail-main-column"
import { TicketDetailSidebar } from "@client/features/tickets/components/ticket-detail-sidebar"
import { TicketDetailDialogs } from "@client/features/tickets/components/ticket-detail-dialogs"
import { formatStatusLabel } from "@shared/ticket-statuses"
import type { TicketDetailSurface } from "@client/features/tickets/hooks/use-ticket-detail-surface"

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
    handleGoToParentTicket,
    NO_DEPARTMENT_VALUE,
    NO_PROJECT_VALUE,
    NO_PARENT_TICKET_VALUE,
  } = surface

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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,360px)]">
          <div className="space-y-4">
            <Card className="p-5 shadow-none">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Status</p>
                  <p className="mt-1 text-sm capitalize text-slate-900">{formatStatusLabel(ticket.status)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Type</p>
                  <p className="mt-1 text-sm capitalize text-slate-900">{ticket.type}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Priority</p>
                  <p className="mt-1 text-sm capitalize text-slate-900">{ticket.priority}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Assignee</p>
                  <p className="mt-1 text-sm text-slate-900">
                    {ticket.assignee?.name || ticket.assignee?.email || "Unassigned"}
                  </p>
                </div>
              </div>
            </Card>

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
            />
          </div>

          <div className="space-y-4">
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
            onBackToTickets={onBackToTickets}
            onGoToParentTicket={handleGoToParentTicket}
            onCopyTicketLabel={actions.handleCopyTicketLabel}
            onCopyShareUrl={actions.handleCopyShareUrl}
            onCopyHyperlinkedUrl={actions.handleCopyHyperlinkedUrl}
            onRequestDelete={actions.openDeleteDialog}
            onStatusChange={(status) => {
              void actions.handleStatusChange(status)
            }}
          />
          <div className="flex-1 overflow-y-auto">{gridContent}</div>
        </>
      ) : (
        gridContent
      )}

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
