"use client"

type TicketListQueryKeyParams = Record<string, string | number | boolean | null | undefined>

function compactParams(params: TicketListQueryKeyParams) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .sort(([left], [right]) => left.localeCompare(right))
  )
}

export const ticketQueryKeys = {
  all: () => ["tickets"] as const,
  lists: () => ["tickets", "list"] as const,
  list: (params: TicketListQueryKeyParams) =>
    ["tickets", "list", compactParams(params)] as const,
  detailRoot: () => ["tickets", "detail"] as const,
  detail: (ticketId: string) => ["tickets", "detail", ticketId] as const,
  entityRoot: () => ["ticket"] as const,
  entity: (ticketId: string) => ["ticket", ticketId] as const,
}

