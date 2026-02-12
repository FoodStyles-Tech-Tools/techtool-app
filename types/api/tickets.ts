import type { CursorPage } from "./common"

export type TicketPerson = {
  id: string
  name: string | null
  email: string
  image: string | null
}

export type TicketRelation = {
  id: string
  name: string
}

export type TicketListItem = {
  id: string
  display_id: string | null
  title: string
  status: string
  priority: string
  type: string | null
  created_at: string
  updated_at: string
  project: TicketRelation | null
  assignee: TicketPerson | null
  department: TicketRelation | null
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
  epic: { id: string; name: string; color: string } | null
  sprint: { id: string; name: string; status: string } | null
}

export type TicketListResponse = CursorPage<TicketListItem>
