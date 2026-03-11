import { describe, expect, it } from "vitest"
import { parseDiscordOutboxBody, parseRevalidateBody } from "@/server/validation/internal"

describe("internal validation", () => {
  it("keeps valid tags and strips invalid ones", () => {
    expect(parseRevalidateBody({ tags: ["tickets", "", 7, "projects"] })).toEqual({
      tags: ["tickets", "projects"],
    })
  })

  it("normalizes discord outbox limit", () => {
    expect(parseDiscordOutboxBody({ limit: "200" })).toEqual({ limit: 100 })
    expect(parseDiscordOutboxBody({ limit: "0" })).toEqual({ limit: 1 })
    expect(parseDiscordOutboxBody({})).toEqual({ limit: 20 })
  })
})
