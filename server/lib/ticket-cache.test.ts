import { beforeEach, describe, expect, it, vi } from "vitest"

const getCacheNamespaceVersion = vi.fn()
const bumpCacheNamespaceVersion = vi.fn()

vi.mock("./cache", () => ({
  getCacheNamespaceVersion,
  bumpCacheNamespaceVersion,
}))

describe("ticket-cache helpers", () => {
  beforeEach(() => {
    vi.resetModules()
    getCacheNamespaceVersion.mockReset()
    bumpCacheNamespaceVersion.mockReset()
  })

  it("reads the ticket cache namespace version", async () => {
    getCacheNamespaceVersion.mockResolvedValue(7)
    const { getTicketCacheVersion } = await import("./ticket-cache")

    await expect(getTicketCacheVersion()).resolves.toBe(7)
    expect(getCacheNamespaceVersion).toHaveBeenCalledWith("tickets")
  })

  it("bumps the ticket cache namespace version", async () => {
    bumpCacheNamespaceVersion.mockResolvedValue(8)
    const { invalidateTicketCaches } = await import("./ticket-cache")

    await expect(invalidateTicketCaches()).resolves.toBe(8)
    expect(bumpCacheNamespaceVersion).toHaveBeenCalledWith("tickets")
  })
})


