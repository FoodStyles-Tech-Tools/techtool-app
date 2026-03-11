import { describe, expect, it } from "vitest"
import { format } from "date-fns"
import {
  endOfISOWeek,
  getDefaultReportDateRange,
  getISOWeekKey,
  startOfCurrentISOWeek,
} from "./report-date-range"

describe("report-date-range", () => {
  it("starts the ISO week on Monday", () => {
    const result = startOfCurrentISOWeek(new Date("2026-03-11T10:00:00.000Z"))
    expect(result.getDay()).toBe(1)
    expect(format(result, "yyyy-MM-dd HH:mm:ss")).toBe("2026-03-09 00:00:00")
  })

  it("ends the ISO week on Sunday", () => {
    const result = endOfISOWeek(new Date("2026-03-11T10:00:00.000Z"))
    expect(result.getDay()).toBe(0)
    expect(format(result, "yyyy-MM-dd HH:mm:ss")).toBe("2026-03-15 23:59:59")
    expect(result.getMilliseconds()).toBe(999)
  })

  it("returns the latest five completed ISO weeks", () => {
    const range = getDefaultReportDateRange(new Date("2026-03-11T10:00:00.000Z"))
    expect(format(range.start, "yyyy-MM-dd HH:mm:ss")).toBe("2026-02-02 00:00:00")
    expect(format(range.end, "yyyy-MM-dd HH:mm:ss")).toBe("2026-03-08 23:59:59")
    expect(range.end.getMilliseconds()).toBe(999)
  })

  it("formats ISO week keys with zero-padded weeks", () => {
    expect(getISOWeekKey(new Date("2026-01-05T12:00:00.000Z"))).toBe("2026-W02")
  })
})
