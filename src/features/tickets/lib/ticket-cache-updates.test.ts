import { beforeEach, describe, expect, it, vi } from "vitest"
import type { QueryClient } from "@tanstack/react-query"
import {
  applyTicketCreateSuccess,
  applyTicketEntitySuccess,
  applyTicketStatusWithReasonSuccess,
} from "@client/features/tickets/lib/ticket-cache-updates"
import { ticketQueryKeys } from "@client/features/tickets/lib/query-keys"
import type { Ticket } from "@shared/types"

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "ticket-1",
    display_id: "HRB-1",
    displayId: "HRB-1",
    parent_ticket_id: null,
    parentTicketId: null,
    title: "Test ticket",
    description: null,
    status: "open",
    priority: "medium",
    type: "bug",
    due_date: null,
    dueDate: null,
    sqa_assigned_at: null,
    sqaAssignedAt: null,
    links: [],
    reason: null,
    department: null,
    epic: null,
    sprint: null,
    project: { id: "project-1", name: "Test Project" } as any,
    assignee: null,
    sqa_assignee: null,
    sqaAssignee: null,
    requested_by: { id: "requester-1", name: "Requester", email: "r@test.com" } as any,
    requestedBy: { id: "requester-1", name: "Requester", email: "r@test.com" } as any,
    created_at: "2026-03-10T00:00:00.000Z",
    createdAt: "2026-03-10T00:00:00.000Z",
    started_at: null,
    startedAt: null,
    completed_at: null,
    completedAt: null,
    assigned_at: null,
    assignedAt: null,
    ...overrides,
  }
}

function makeQueryClient() {
  const store: Map<string, unknown> = new Map()

  const setQueryData = vi.fn((key: unknown[], updater: unknown) => {
    const serializedKey = JSON.stringify(key)
    const current = store.get(serializedKey)
    const next = typeof updater === "function" ? updater(current) : updater
    if (next !== undefined) {
      store.set(serializedKey, next)
    }
    return next
  })

  const setQueriesData = vi.fn((filter: { queryKey: unknown[] }, updater: (current: unknown) => unknown) => {
    const prefix = JSON.stringify(filter.queryKey).slice(0, -1)
    for (const [key, value] of store.entries()) {
      if (key.startsWith(prefix)) {
        const next = updater(value)
        if (next !== undefined) store.set(key, next)
      }
    }
  })

  const invalidateQueries = vi.fn()
  const cancelQueries = vi.fn()

  const getQueryData = (key: unknown[]) => store.get(JSON.stringify(key))

  const seed = (key: unknown[], value: unknown) => store.set(JSON.stringify(key), value)

  return {
    setQueryData,
    setQueriesData,
    cancelQueries,
    invalidateQueries,
    getQueryData,
    seed,
  } as unknown as QueryClient & { getQueryData: (key: unknown[]) => unknown; seed: (key: unknown[], value: unknown) => void }
}

describe("applyTicketEntitySuccess", () => {
  let queryClient: ReturnType<typeof makeQueryClient>
  const ticket = makeTicket({ status: "in_progress" })

  beforeEach(() => {
    queryClient = makeQueryClient()
  })

  it("writes the ticket into the entity cache", () => {
    applyTicketEntitySuccess(queryClient as any, { ticket })
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      ticketQueryKeys.entity(ticket.id),
      { ticket }
    )
  })

  it("patches the ticket into an existing detail cache entry", () => {
    const existingDetail = {
      ticket: makeTicket({ status: "open" }),
      comments: [],
      relations: { parent: null, subtasks: [], mentionedInComments: [] },
    }
    queryClient.seed(ticketQueryKeys.detail(ticket.id), existingDetail)

    applyTicketEntitySuccess(queryClient as any, { ticket })

    const updatedDetail = queryClient.getQueryData(ticketQueryKeys.detail(ticket.id)) as any
    expect(updatedDetail.ticket.status).toBe("in_progress")
    // Original relations / comments are preserved
    expect(updatedDetail.comments).toEqual([])
    expect(updatedDetail.relations.subtasks).toEqual([])
  })

  it("does not overwrite a missing detail cache entry (avoids creating stale skeleton)", () => {
    // Detail cache is empty (ticket not yet viewed in detail)
    applyTicketEntitySuccess(queryClient as any, { ticket })

    const detail = queryClient.getQueryData(ticketQueryKeys.detail(ticket.id))
    expect(detail).toBeUndefined()
  })

  it("updates the matching ticket in all list caches", () => {
    const listKey = ticketQueryKeys.list({})
    const oldTicket = makeTicket({ status: "open" })
    queryClient.seed(listKey as any, {
      items: [oldTicket],
      data: [oldTicket],
    })

    applyTicketEntitySuccess(queryClient as any, { ticket })

    expect(queryClient.setQueriesData).toHaveBeenCalledWith(
      { queryKey: ticketQueryKeys.lists() },
      expect.any(Function)
    )
  })

  it("invalidates detailRoot and the ticket's project queries", () => {
    applyTicketEntitySuccess(queryClient as any, { ticket })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ticketQueryKeys.detailRoot(),
      refetchType: "none",
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["project", "project-1"],
    })
  })
})

describe("applyTicketStatusWithReasonSuccess", () => {
  let queryClient: ReturnType<typeof makeQueryClient>
  const ticket = makeTicket({ status: "cancelled" })

  beforeEach(() => {
    queryClient = makeQueryClient()
  })

  it("applies entity success AND additionally invalidates the specific detail and lists", () => {
    applyTicketStatusWithReasonSuccess(queryClient as any, { ticket })

    // From applyTicketEntitySuccess
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      ticketQueryKeys.entity(ticket.id),
      { ticket }
    )
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ticketQueryKeys.detailRoot(),
      refetchType: "none",
    })

    // Additionally invalidates the specific ticket detail (for comment/activity refresh)
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ticketQueryKeys.detail(ticket.id),
      refetchType: "none",
    })
    // And the full lists
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ticketQueryKeys.lists(),
      refetchType: "none",
    })
  })
})

describe("applyTicketCreateSuccess", () => {
  let queryClient: ReturnType<typeof makeQueryClient>
  const ticket = makeTicket()

  beforeEach(() => {
    queryClient = makeQueryClient()
  })

  it("sets the entity cache for the new ticket", () => {
    applyTicketCreateSuccess(queryClient as any, { ticket })
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      ticketQueryKeys.entity(ticket.id),
      { ticket }
    )
  })

  it("invalidates lists and detailRoot so the new ticket appears in views", () => {
    applyTicketCreateSuccess(queryClient as any, { ticket })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ticketQueryKeys.lists(),
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ticketQueryKeys.detailRoot(),
    })
  })
})
