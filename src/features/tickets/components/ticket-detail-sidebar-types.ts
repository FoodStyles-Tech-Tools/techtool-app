"use client"

export type ParentTicketOption = {
  id: string
  displayId: string | null
  display_id?: string | null
  title: string
}

export type TicketProjectOption = {
  id: string
  name: string | null
  status?: string | null
}
