"use client"

import { getClientAppUrl } from "@client/lib/config/client-env"
import type { Ticket } from "@shared/types"

function getTicketShareBaseOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin
  }

  return getClientAppUrl()
}

export function buildTicketShareUrl(ticket: Pick<Ticket, "id" | "displayId">) {
  const slug = String(ticket.displayId || ticket.id).toLowerCase()
  return new URL(`/tickets/${slug}`, getTicketShareBaseOrigin()).toString()
}

export function buildTicketClipboardLabel(
  ticket: Pick<Ticket, "id" | "displayId" | "title" | "project" | "epic">
) {
  const projectName = ticket.project?.name || "-"
  const epicName = ticket.epic?.name || "-"
  const displayIdLabel = String(ticket.displayId || ticket.id.slice(0, 8)).toUpperCase()
  return `[Project: ${projectName}] [Epic: ${epicName}] ${displayIdLabel} - ${ticket.title}`
}
