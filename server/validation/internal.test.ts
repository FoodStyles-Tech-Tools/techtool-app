import { describe, expect, it } from "vitest"
import { parseRevalidateBody } from "@server/validation/internal"

describe("internal validation", () => {
  it("keeps valid tags and strips invalid ones", () => {
    expect(parseRevalidateBody({ tags: ["tickets", "", 7, "projects"] })).toEqual({
      tags: ["tickets", "projects"],
    })
  })
})
