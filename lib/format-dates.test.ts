import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { formatRelativeDate, getDueDateDisplay, toUTCISOStringPreserveLocal } from "./format-dates"

describe("formatRelativeDate", () => {
  it("returns 'today' for today", () => {
    const today = new Date()
    expect(formatRelativeDate(today.toISOString())).toBe("today")
  })

  it("returns 'yesterday' for yesterday", () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    expect(formatRelativeDate(d.toISOString())).toBe("yesterday")
  })

  it("returns 'N days ago' for 2-7 days", () => {
    const d = new Date()
    d.setDate(d.getDate() - 3)
    expect(formatRelativeDate(d.toISOString())).toBe("3 days ago")
  })
})

describe("getDueDateDisplay", () => {
  it("returns 'No due date' for null/undefined", () => {
    expect(getDueDateDisplay(null).label).toBe("No due date")
    expect(getDueDateDisplay(undefined).label).toBe("No due date")
  })

  it("returns 'Invalid date' for invalid string", () => {
    expect(getDueDateDisplay("not-a-date").label).toBe("Invalid date")
  })

  it("returns 'Due today' for today", () => {
    const today = new Date()
    const result = getDueDateDisplay(today.toISOString())
    expect(result.label).toBe("Due today")
  })

  it("returns overdue label for past date", () => {
    const past = new Date()
    past.setDate(past.getDate() - 1)
    const result = getDueDateDisplay(past.toISOString())
    expect(result.label).toContain("Overdue")
  })
})

describe("toUTCISOStringPreserveLocal", () => {
  it("returns ISO string", () => {
    const d = new Date("2025-02-11T12:00:00")
    const result = toUTCISOStringPreserveLocal(d)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
