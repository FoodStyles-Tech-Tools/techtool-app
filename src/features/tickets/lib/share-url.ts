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

