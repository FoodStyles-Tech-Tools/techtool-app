import { describe, expect, it } from "vitest"
import { buildAssignmentPayload, buildStatusPayload } from "@client/features/tickets/lib/update-payloads"

describe("buildAssignmentPayload", () => {
  it("returns assigneeId when assigning", () => {
    expect(buildAssignmentPayload("assigneeId", "user-1")).toEqual({
      assigneeId: "user-1",
    })
  })

  it("returns assigneeId: null when clearing the assignee", () => {
    expect(buildAssignmentPayload("assigneeId", null)).toEqual({
      assigneeId: null,
    })
  })

  it("treats empty string as a clear (null)", () => {
    expect(buildAssignmentPayload("assigneeId", "")).toEqual({
      assigneeId: null,
    })
  })

  it("returns sqaAssigneeId when assigning SQA", () => {
    expect(buildAssignmentPayload("sqaAssigneeId", "user-sqa")).toEqual({
      sqaAssigneeId: "user-sqa",
    })
  })

  it("returns sqaAssigneeId: null when clearing SQA assignee", () => {
    expect(buildAssignmentPayload("sqaAssigneeId", null)).toEqual({
      sqaAssigneeId: null,
    })
  })
})

describe("buildStatusPayload", () => {
  it("returns only the status field", () => {
    expect(buildStatusPayload("in_progress")).toEqual({ status: "in_progress" })
    expect(buildStatusPayload("completed")).toEqual({ status: "completed" })
    expect(buildStatusPayload("open")).toEqual({ status: "open" })
    expect(buildStatusPayload("cancelled")).toEqual({ status: "cancelled" })
  })
})
