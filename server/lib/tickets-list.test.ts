import { describe, expect, it } from "vitest"

describe("parseTicketListQuery", () => {
  it("prefers camelCase query params and parses booleans, paging, and sorting", async () => {
    const { parseTicketListQuery } = await import("./tickets-list")
    const params = new URLSearchParams({
      projectId: "project-1",
      parentTicketId: "ticket-1",
      assigneeId: "user-1",
      status: "open",
      departmentId: "dept-1",
      requestedById: "user-2",
      sprintId: "sprint-1",
      excludeDone: "true",
      excludeSubtasks: "true",
      q: "search term",
      cursor: "2026-03-10T00:00:00.000Z|ticket-9",
      page: "3",
      limit: "250",
      sortBy: "priority",
      sortDirection: "asc",
    })

    expect(parseTicketListQuery(params)).toEqual({
      projectId: "project-1",
      parentTicketId: "ticket-1",
      assigneeId: "user-1",
      status: "open",
      departmentId: "dept-1",
      requestedById: "user-2",
      sprintId: "sprint-1",
      excludeDone: true,
      excludeSubtasks: true,
      queryText: "search term",
      cursor: "2026-03-10T00:00:00.000Z|ticket-9",
      page: 3,
      limit: 100,
      sortBy: "priority",
      sortDirection: "asc",
    })
  })

  it("falls back to snake_case params and keeps unset values nullable", async () => {
    const { parseTicketListQuery } = await import("./tickets-list")
    const params = new URLSearchParams({
      project_id: "project-2",
      parent_ticket_id: "ticket-2",
      assignee_id: "unassigned",
      department_id: "no_department",
      requested_by_id: "user-3",
      sprint_id: "no_sprint",
      exclude_done: "false",
      exclude_subtasks: "false",
      sort_by: "status",
      sort_direction: "desc",
    })

    expect(parseTicketListQuery(params)).toEqual({
      projectId: "project-2",
      parentTicketId: "ticket-2",
      assigneeId: "unassigned",
      status: null,
      departmentId: "no_department",
      requestedById: "user-3",
      sprintId: "no_sprint",
      excludeDone: false,
      excludeSubtasks: false,
      queryText: null,
      cursor: null,
      page: null,
      limit: null,
      sortBy: "status",
      sortDirection: "desc",
    })
  })

  it("normalizes invalid paging and sort direction values", async () => {
    const { parseTicketListQuery } = await import("./tickets-list")
    const params = new URLSearchParams({
      page: "0",
      limit: "-5",
      sortDirection: "sideways",
    })

    expect(parseTicketListQuery(params)).toEqual({
      projectId: null,
      parentTicketId: null,
      assigneeId: null,
      status: null,
      departmentId: null,
      requestedById: null,
      sprintId: null,
      excludeDone: false,
      excludeSubtasks: false,
      queryText: null,
      cursor: null,
      page: 1,
      limit: 1,
      sortBy: null,
      sortDirection: null,
    })
  })
})


