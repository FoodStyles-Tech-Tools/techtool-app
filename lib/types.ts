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

/** Cancelled reason stored on ticket.reason */
export interface TicketCancelledReason {
  cancelled?: {
    reason: string
    cancelledAt: string
  }
}

/**
 * Full ticket shape as returned by API / useTickets.
 * Optional started_at, completed_at, assigned_at may be present from API.
 */
export interface Ticket {
  id: string
  display_id: string | null
  title: string
  description: string | null
  status: string
  priority: string
  type: string
  due_date: string | null
  sqa_assigned_at?: string | null
  links: string[]
  reason?: TicketCancelledReason | null
  department: TicketDepartment | null
  epic: TicketEpic | null
  sprint: TicketSprint | null
  project: TicketProject | null
  assignee: TicketUser | null
  sqa_assignee: TicketUser | null
  requested_by: TicketUser
  created_at: string
  started_at?: string | null
  completed_at?: string | null
  assigned_at?: string | null
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

/** Google Calendar event summary used on the dashboard */
export interface CalendarEvent {
  id: string
  summary?: string | null
  description?: string | null
  location?: string | null
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
  hangoutLink?: string | null
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string
      uri?: string
      label?: string
    }>
  }
}

/** Data shape for quick-add ticket form */
export interface QuickAddTicketData {
  title: string
  description: string
  type: "bug" | "request" | "task"
  priority: "low" | "medium" | "high" | "urgent"
  status: string
  department_id?: string
  assignee_id?: string
  sqa_assignee_id?: string
  requested_by_id?: string
  due_date?: string | null
}
