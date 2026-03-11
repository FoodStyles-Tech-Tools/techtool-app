import { describe, expect, it, vi } from "vitest"
import { buildAssignmentPayload, buildStatusPayload } from "@client/features/tickets/lib/update-payloads"
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
    type: "task",
    due_date: null,
    dueDate: null,
    sqa_assigned_at: null,
    sqaAssignedAt: null,
    links: [],
    reason: null,
    department: null,
    epic: null,
    sprint: null,
    project: null,
    assignee: null,
    sqa_assignee: null,
    sqaAssignee: null,
    requested_by: {
      id: "requester-1",
      name: "Requester",
      email: "requester@example.com",
    },
    requestedBy: {
      id: "requester-1",
      name: "Requester",
      email: "requester@example.com",
    },
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

describe("buildAssignmentPayload", () => {
  it("sets assignedAt when assigning a new assignee", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-10T08:00:00.000Z"))

    expect(buildAssignmentPayload("assigneeId", makeTicket(), "user-1")).toEqual({
      assigneeId: "user-1",
      assignedAt: "2026-03-10T08:00:00.000Z",
    })

    vi.useRealTimers()
  })

  it("clears assignedAt when assignee is removed", () => {
    const ticket = makeTicket({
      assignee: { id: "user-1", name: "Assignee", email: "assignee@example.com" },
      assigned_at: "2026-03-10T01:00:00.000Z",
      assignedAt: "2026-03-10T01:00:00.000Z",
    })

    expect(buildAssignmentPayload("assigneeId", ticket, null)).toEqual({
      assigneeId: null,
      assignedAt: null,
    })
  })

  it("sets sqaAssignedAt when assigning a new SQA owner", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-10T09:30:00.000Z"))

    expect(buildAssignmentPayload("sqaAssigneeId", makeTicket(), "user-sqa")).toEqual({
      sqaAssigneeId: "user-sqa",
      sqaAssignedAt: "2026-03-10T09:30:00.000Z",
    })

    vi.useRealTimers()
  })
})

describe("buildStatusPayload", () => {
  it("maps started/completed timestamps into camelCase payload keys", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-10T10:00:00.000Z"))

    expect(buildStatusPayload(makeTicket({ status: "open" }), "completed")).toEqual({
      status: "completed",
      startedAt: "2026-03-10T10:00:00.000Z",
      completedAt: "2026-03-10T10:00:00.000Z",
    })

    vi.useRealTimers()
  })

  it("clears completed reason state when reopening a done ticket", () => {
    const ticket = makeTicket({
      status: "completed",
      started_at: "2026-03-10T01:00:00.000Z",
      startedAt: "2026-03-10T01:00:00.000Z",
      completed_at: "2026-03-10T02:00:00.000Z",
      completedAt: "2026-03-10T02:00:00.000Z",
      reason: {
        cancelled: {
          reason: "Old reason",
          cancelledAt: "2026-03-10T02:00:00.000Z",
        },
      },
    })

    expect(buildStatusPayload(ticket, "in_progress")).toEqual({
      status: "in_progress",
      completedAt: null,
      reason: null,
    })
  })
})
