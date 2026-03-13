import { sanitizeLinkArray } from "@shared/links"
import type { Ticket, RelatedTicket, MentionedTicketRelation, TicketDetailRelations } from "./domain"

export type RawRelatedTicket = {
  id: string
  display_id?: string | null
  displayId?: string | null
  title: string
  status: string
  type: string | null
  priority?: string
  assignee?: RelatedTicket["assignee"]
}

export type RawMentionedTicketRelation = {
  ticket: RawRelatedTicket
  mentionedInCommentIds?: string[]
  comment_ids?: string[]
}

export type RawTicketDetailRelations = {
  parent: RawRelatedTicket | null
  subtasks: RawRelatedTicket[]
  mentioned_in_comments?: RawMentionedTicketRelation[]
  mentionedInComments?: RawMentionedTicketRelation[]
}

export type RawTicket = {
  id: string
  display_id?: string | null
  displayId?: string | null
  parent_ticket_id?: string | null
  parentTicketId?: string | null
  subtasks_count?: number
  subtasksCount?: number
  title: string
  description: string | null
  status: string
  priority: string
  type: string
  due_date?: string | null
  dueDate?: string | null
  sqa_assigned_at?: string | null
  sqaAssignedAt?: string | null
  links: string[]
  reason?: Ticket["reason"]
  department: Ticket["department"]
  epic: Ticket["epic"]
  sprint: Ticket["sprint"]
  project: Ticket["project"]
  deploy_round?: Ticket["deployRound"]
  deployRound?: Ticket["deployRound"]
  assignee: Ticket["assignee"]
  sqa_assignee?: Ticket["sqaAssignee"]
  sqaAssignee?: Ticket["sqaAssignee"]
  requested_by?: Ticket["requestedBy"]
  requestedBy?: Ticket["requestedBy"]
  created_at?: string
  createdAt?: string
  started_at?: string | null
  startedAt?: string | null
  completed_at?: string | null
  completedAt?: string | null
  assigned_at?: string | null
  assignedAt?: string | null
}

export function normalizeRelatedTicket(ticket: RawRelatedTicket): RelatedTicket {
  return {
    id: ticket.id,
    displayId: ticket.displayId ?? ticket.display_id ?? null,
    title: ticket.title,
    status: ticket.status,
    type: ticket.type,
    priority: ticket.priority,
    assignee: ticket.assignee ?? null,
  }
}

export function normalizeMentionedTicketRelation(relation: RawMentionedTicketRelation): MentionedTicketRelation {
  return {
    ticket: normalizeRelatedTicket(relation.ticket),
    mentionedInCommentIds: relation.mentionedInCommentIds ?? relation.comment_ids ?? [],
  }
}

/** Normalize a snake_case API ticket response to the camelCase domain Ticket type. */
export function normalizeTicket(ticket: RawTicket): Ticket {
  const parentTicketId = ticket.parentTicketId ?? ticket.parent_ticket_id ?? null
  const baseType = ticket.type
  const resolvedType = baseType || "bug"

  return {
    displayId: ticket.displayId ?? ticket.display_id ?? null,
    parentTicketId,
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    type: resolvedType,
    dueDate: ticket.dueDate ?? ticket.due_date ?? null,
    sqaAssignedAt: ticket.sqaAssignedAt ?? ticket.sqa_assigned_at ?? null,
    requestedBy: (ticket.requestedBy ?? ticket.requested_by)!,
    sqaAssignee: ticket.sqaAssignee ?? ticket.sqa_assignee ?? null,
    createdAt: (ticket.createdAt ?? ticket.created_at)!,
    startedAt: ticket.startedAt ?? ticket.started_at ?? null,
    completedAt: ticket.completedAt ?? ticket.completed_at ?? null,
    assignedAt: ticket.assignedAt ?? ticket.assigned_at ?? null,
    links: sanitizeLinkArray(ticket.links),
    reason: ticket.reason ?? null,
    department: ticket.department,
    epic: ticket.epic,
    sprint: ticket.sprint,
    project: ticket.project,
    deployRound: ticket.deployRound ?? ticket.deploy_round ?? null,
    assignee: ticket.assignee,
    subtasksCount: ticket.subtasksCount ?? ticket.subtasks_count,
  }
}

export function normalizeTicketRelations(relations?: RawTicketDetailRelations): TicketDetailRelations | undefined {
  if (!relations) return relations

  const mentionedInComments = (relations.mentionedInComments ?? relations.mentioned_in_comments ?? []).map(
    normalizeMentionedTicketRelation
  )

  return {
    parent: relations.parent ? normalizeRelatedTicket(relations.parent) : null,
    subtasks: relations.subtasks.map(normalizeRelatedTicket),
    mentionedInComments,
  }
}
