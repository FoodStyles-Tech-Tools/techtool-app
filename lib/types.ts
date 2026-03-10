/**
 * Shared domain types used across the app (API, hooks, components).
 * Import from here to avoid duplication and keep a single source of truth.
 */

/** User as returned by users table / useUsers (with optional role) */
export interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  discord_id?: string | null
  role?: string | null
  created_at?: string
}

/** Role permission shape */
export interface RolePermission {
  id?: string
  resource: string
  action: string
}

/** Role with permissions */
export interface Role {
  id: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
  permissions: RolePermission[]
}

/** Department as returned by API / useDepartments */
export interface Department {
  id: string
  name: string
}

/** Ticket relation: project */
export interface TicketProject {
  id: string
  name: string
  require_sqa?: boolean
}

/** Ticket relation: assignee / sqa_assignee / requested_by */
export interface TicketUser {
  id: string
  name: string | null
  email: string
  image?: string | null
}

/** Ticket relation: department */
export interface TicketDepartment {
  id: string
  name: string
}

/** Ticket relation: epic */
export interface TicketEpic {
  id: string
  name: string
  color: string
}

/** Ticket relation: sprint */
export interface TicketSprint {
  id: string
  name: string
  status: string
}

/** Related ticket for parent/subtask/mention relation display */
export interface RelatedTicket {
  id: string
  display_id: string | null
  displayId?: string | null
  title: string
  status: string
  type: string | null
}

/** Mention relation grouped by target ticket */
export interface MentionedTicketRelation {
  ticket: RelatedTicket
  mentionedInCommentIds?: string[]
  comment_ids: string[]
}

/** Ticket detail relations payload */
export interface TicketDetailRelations {
  parent: RelatedTicket | null
  subtasks: RelatedTicket[]
  mentioned_in_comments: MentionedTicketRelation[]
  mentionedInComments?: MentionedTicketRelation[]
}

/** Cancelled / archived reason stored on ticket.reason */
export interface TicketCancelledReason {
  cancelled?: {
    reason: string
    cancelledAt: string
  }
  rejected?: {
    reason: string
    rejectedAt: string
  }
  archived?: {
    reason: string
    archivedAt: string
  }
}

/**
 * Full ticket shape as returned by API / useTickets.
 * Optional started_at, completed_at, assigned_at may be present from API.
 */
export interface Ticket {
  id: string
  display_id: string | null
  displayId?: string | null
  parent_ticket_id?: string | null
  parentTicketId?: string | null
  title: string
  description: string | null
  status: string
  priority: string
  type: string
  due_date: string | null
  dueDate?: string | null
  sqa_assigned_at?: string | null
  sqaAssignedAt?: string | null
  links: string[]
  reason?: TicketCancelledReason | null
  department: TicketDepartment | null
  epic: TicketEpic | null
  sprint: TicketSprint | null
  project: TicketProject | null
  assignee: TicketUser | null
  sqa_assignee: TicketUser | null
  sqaAssignee?: TicketUser | null
  requested_by: TicketUser
  requestedBy?: TicketUser
  created_at: string
  createdAt?: string
  started_at?: string | null
  startedAt?: string | null
  completed_at?: string | null
  completedAt?: string | null
  assigned_at?: string | null
  assignedAt?: string | null
}

/** Minimal ticket for lists (e.g. dashboard carousel) */
export interface TicketSummary {
  id: string
  display_id: string | null
  title: string
  status: string
  priority: string
  created_at: string
  project?: TicketProject | null
}

/** Data shape for quick-add ticket form */
export interface QuickAddTicketData {
  title: string
  description: string
  type: "bug" | "request" | "task" | "subtask"
  priority: "low" | "medium" | "high" | "urgent"
  status: string
  department_id?: string
  assignee_id?: string
  sqa_assignee_id?: string
  requested_by_id?: string
  due_date?: string | null
}
