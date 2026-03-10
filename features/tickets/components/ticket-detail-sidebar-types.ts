"use client"

export type ParentTicketOption = {
  id: string
  display_id: string | null
  title: string
}

export type TimestampValidation = {
  assigned_at: boolean
  started_at: boolean
  completed_at: boolean
}

export type TicketProjectOption = {
  id: string
  name: string | null
  status?: string | null
}
