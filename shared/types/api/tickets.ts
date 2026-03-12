export type TicketPerson = {
  id: string
  name: string | null
  email: string
  image: string | null
}

export type TicketRelation = {
  id: string
  name: string
  require_sqa?: boolean
}

export type TicketEpicRelation = {
  id: string
  name: string
  color: string
}

export type TicketSprintRelation = {
  id: string
  name: string
}

export type TicketReasonMap = {
  cancelled?: {
    reason: string
    cancelledAt: string
  }
  rejected?: {
    reason: string
    rejectedAt: string
  }
  returned_to_dev?: {
    reason: string
    returnedAt: string
  }
  archived?: {
    reason: string
    archivedAt: string
  }
}

export type TicketListItem = {
  id: string
  display_id: string | null
  parent_ticket_id?: string | null
  title: string
  status: string
  priority: string
  type: string | null
  due_date?: string | null
  links?: string[] | null
  reason?: TicketReasonMap | null
  assigned_at?: string | null
  sqa_assigned_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
  project: TicketRelation | null
  assignee: TicketPerson | null
  sqa_assignee?: TicketPerson | null
  requested_by?: TicketPerson | null
  department: TicketRelation | null
  epic?: TicketEpicRelation | null
  sprint?: TicketSprintRelation | null
}

export type TicketDetailPayload = TicketListItem & {
  description: string | null
  links: string[] | null
  due_date: string | null
  assigned_at: string | null
  sqa_assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  sqa_assignee: TicketPerson | null
  requested_by: TicketPerson | null
  epic: TicketEpicRelation | null
  sprint: TicketSprintRelation | null
}
