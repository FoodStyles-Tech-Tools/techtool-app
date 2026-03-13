import { describe, expect, it } from "vitest"
import {
  parseLegacyNotificationsQuery,
  parseMarkReadBody,
  parseNotificationIdParams,
  parseV2NotificationsQuery,
} from "@server/validation/notifications"

describe("notifications validation", () => {
  it("normalizes legacy query and clamps limit", () => {
    expect(parseLegacyNotificationsQuery({ unread_only: "true", limit: "150" })).toEqual({
      unreadOnly: true,
      limit: 100,
    })
  })

  it("normalizes v2 cursor pagination query", () => {
    expect(parseV2NotificationsQuery({ cursor: "2026-01-01T00:00:00.000Z", limit: "0" })).toEqual({
      cursor: "2026-01-01T00:00:00.000Z",
      unreadOnly: false,
      limit: 1,
    })
  })

  it("filters mark-read ids and ticket id", () => {
    expect(
      parseMarkReadBody({
        ids: ["n1", 7, "n2"],
        ticket_id: "ticket-1",
      })
    ).toEqual({
      ids: ["n1", "n2"],
      ticketId: "ticket-1",
    })
  })

  it("parses notification params", () => {
    expect(parseNotificationIdParams({ id: "notif-1" })).toEqual({ id: "notif-1" })
  })
})
