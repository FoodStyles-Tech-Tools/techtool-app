/**
 * Shared domain types used across the app (API, hooks, components).
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

/** Asset owner / collaborator */
export interface AssetOwner {
  id: string
  name: string | null
  email: string
}

export interface AssetCollaborator {
  id: string
  name: string | null
  email: string
  image: string | null
}

/** Asset domain type */
export interface Asset {
  id: string
  name: string
  description: string | null
  links: string[]
  production_url: string | null
  owner: AssetOwner | null
  owner_id: string
  collaborator_ids: string[]
  collaborators: AssetCollaborator[]
  created_at: string
}

/** Project collaborator (requester / collaborator) */
export interface ProjectCollaborator {
  id: string
  name: string | null
  email: string
  image: string | null
}

/** Aggregate ticket stats for a project */
export interface ProjectTicketStats {
  total: number
  open: number
  done: number
}

/** Project as used across hooks/components */
export interface Project {
  id: string
  name: string
  description: string | null
  status: string
  require_sqa: boolean
  links: string[]
  department: Department | null
  owner: User | null
  owner_id: string | null
  collaborator_ids: string[]
  collaborators: ProjectCollaborator[]
  requester_ids: string[]
  requesters: ProjectCollaborator[]
  created_at: string
  tickets?: Array<{ count: number }>
  ticket_stats?: ProjectTicketStats
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
}

/** Related ticket for parent/subtask/mention relation display */
export interface RelatedTicket {
  id: string
  displayId: string | null
  title: string
  status: string
  type: string | null
}

/** Mention relation grouped by target ticket */
export interface MentionedTicketRelation {
  ticket: RelatedTicket
  mentionedInCommentIds: string[]
}

/** Ticket detail relations payload */
export interface TicketDetailRelations {
  parent: RelatedTicket | null
  subtasks: RelatedTicket[]
  mentionedInComments: MentionedTicketRelation[]
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
 * Full normalized ticket shape used across the app.
 */
export interface Ticket {
  id: string
  displayId: string | null
  parentTicketId: string | null
  title: string
  description: string | null
  status: string
  priority: string
  type: string
  dueDate: string | null
  sqaAssignedAt: string | null
  links: string[]
  reason?: TicketCancelledReason | null
  department: TicketDepartment | null
  epic: TicketEpic | null
  sprint: TicketSprint | null
  project: TicketProject | null
  assignee: TicketUser | null
  sqaAssignee: TicketUser | null
  requestedBy: TicketUser
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  assignedAt: string | null
}

/** Minimal ticket for lists (e.g. dashboard carousel) */
export interface TicketSummary {
  id: string
  displayId: string | null
  title: string
  status: string
  priority: string
  createdAt: string
  project?: TicketProject | null
}

/** Data shape for quick-add ticket form */
export interface QuickAddTicketData {
  title: string
  description: string
  type: "bug" | "request" | "task" | "subtask"
  priority: "low" | "medium" | "high" | "urgent"
  status: string
  departmentId?: string
  assigneeId?: string
  sqaAssigneeId?: string
  requestedById?: string
  dueDate?: string | null
}
