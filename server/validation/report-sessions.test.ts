import { describe, expect, it } from "vitest"
import {
  parseCreateReportSessionBody,
  parseReportSessionIdParams,
  parseUpdateReportSessionBody,
} from "@server/validation/report-sessions"

describe("report session validation", () => {
  it("parses id params", () => {
    expect(parseReportSessionIdParams({ id: "abc-123" })).toEqual({ id: "abc-123" })
  })

  it("normalizes create body name and filters", () => {
    expect(
      parseCreateReportSessionBody({
        name: "  Weekly Report  ",
        filters: {
          projectId: "project-1",
          ignored: "value",
        },
      })
    ).toEqual({
      name: "Weekly Report",
      date_range_start: undefined,
      date_range_end: undefined,
      filters: {
        projectId: "project-1",
      },
    })
  })

  it("preserves explicit update fields only", () => {
    expect(
      parseUpdateReportSessionBody({
        insights: "json-string",
        filters: { status: "open", assigneeId: "user-1" },
      })
    ).toEqual({
      name: undefined,
      date_range_start: undefined,
      date_range_end: undefined,
      filters: {
        assigneeId: "user-1",
        status: "open",
      },
      insights: "json-string",
    })
  })
})
