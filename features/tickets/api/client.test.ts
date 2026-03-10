import { beforeEach, describe, expect, it, vi } from "vitest"

const requestJson = vi.fn()

vi.mock("@/lib/client/api", () => ({
  requestJson,
}))

describe("ticket api client helpers", () => {
  beforeEach(() => {
    requestJson.mockReset()
  })

  it("normalizes open subtasks and filters out done statuses", async () => {
    requestJson.mockResolvedValue({
      relations: {
        subtasks: [
          { id: "1", display_id: "HRB-1", title: "Open child", status: "open" },
          { id: "2", display_id: "HRB-2", title: "Done child", status: "completed" },
        ],
      },
    })

    const { fetchTicketOpenSubtasks } = await import("@/features/tickets/api/client")

    await expect(fetchTicketOpenSubtasks("ticket-1")).resolves.toEqual([
      {
        id: "1",
        display_id: "HRB-1",
        displayId: "HRB-1",
        title: "Open child",
        status: "open",
      },
    ])
  })

  it("returns cancel when the user rejects closing subtasks", async () => {
    requestJson.mockResolvedValue({
      relations: {
        subtasks: [{ id: "1", display_id: "HRB-1", title: "Open child", status: "open" }],
      },
    })

    const askDecision = vi.fn().mockResolvedValue("cancel")
    const { resolveTicketDoneStatusGuard } = await import("@/features/tickets/api/client")

    await expect(
      resolveTicketDoneStatusGuard({
        ticketId: "ticket-1",
        targetStatus: "completed",
        askDecision,
      })
    ).resolves.toEqual({
      proceed: false,
      closeSubtasks: false,
      subtasks: [],
    })
  })

  it("requests closing subtasks for done statuses only", async () => {
    requestJson.mockResolvedValue({
      relations: {
        subtasks: [{ id: "1", display_id: "HRB-1", title: "Open child", status: "open" }],
      },
    })

    const askDecision = vi.fn().mockResolvedValue("close_all")
    const { resolveTicketDoneStatusGuard } = await import("@/features/tickets/api/client")

    await expect(
      resolveTicketDoneStatusGuard({
        ticketId: "ticket-1",
        targetStatus: "completed",
        askDecision,
      })
    ).resolves.toEqual({
      proceed: true,
      closeSubtasks: true,
      subtasks: [
        {
          id: "1",
          display_id: "HRB-1",
          displayId: "HRB-1",
          title: "Open child",
          status: "open",
        },
      ],
    })

    expect(askDecision).toHaveBeenCalledWith("completed", [
      {
        id: "1",
        display_id: "HRB-1",
        displayId: "HRB-1",
        title: "Open child",
        status: "open",
      },
    ])
  })
})
