import { beforeEach, describe, expect, it, vi } from "vitest"

const postToDiscordWebhook = vi.fn()

vi.mock("@server/lib/discord-webhook", () => ({
  postToDiscordWebhook,
}))

describe("notifyTicketCreated", () => {
  beforeEach(() => {
    vi.resetModules()
    postToDiscordWebhook.mockReset()
  })

  it("skips Discord notification when assignee is the submitter", async () => {
    const { notifyTicketCreated } = await import("@server/lib/discord-ticket-status")

    await notifyTicketCreated(
      {
        id: "ticket-1",
        display_id: "TCK-1",
        title: "Trigger A Adjustments",
        type: "bug",
        priority: "medium",
        requested_by_id: "reporter-1",
        assignee_id: "submitter-1",
      } as any,
      "submitter@foodstyles.com",
      "submitter-1"
    )

    expect(postToDiscordWebhook).not.toHaveBeenCalled()
  })

  it("sends Discord notification when assignee differs from submitter and reporter", async () => {
    const { notifyTicketCreated } = await import("@server/lib/discord-ticket-status")

    await notifyTicketCreated(
      {
        id: "ticket-2",
        display_id: "TCK-2",
        title: "Another ticket",
        type: "bug",
        priority: "high",
        requested_by_id: "reporter-1",
        assignee_id: "assignee-1",
        assignee: {
          id: "assignee-1",
          name: "Assignee One",
          discord_id: "123456",
        },
      } as any,
      "submitter@foodstyles.com",
      "submitter-1"
    )

    expect(postToDiscordWebhook).toHaveBeenCalledTimes(1)
  })
})
