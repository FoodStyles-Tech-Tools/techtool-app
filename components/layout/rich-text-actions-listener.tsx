"use client"

import { useEffect } from "react"
import { toast } from "@/components/ui/toast"

export function RichTextActionsListener() {
  useEffect(() => {
    const statusCache = new Map<string, string>()
    const statusInFlight = new Set<string>()
    let hydrateScheduled = false

    const formatStatusLabel = (status: string) =>
      status
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase()

    const parseTicketSlugFromHref = (href: string | null): string | null => {
      if (!href) return null
      try {
        const url = new URL(href, window.location.origin)
        const match = url.pathname.match(/\/tickets\/([a-z]{2,}-\d+)\/?$/i)
        return match?.[1]?.toLowerCase() || null
      } catch {
        return null
      }
    }

    const applyTicketStatusBadge = (anchor: HTMLAnchorElement, status: string) => {
      if (!status) return
      if (anchor.getAttribute("data-ticket-status")) return
      if (anchor.querySelector(".mention-ticket-status")) return

      anchor.setAttribute("data-ticket-status", status)
      const statusNode = document.createElement("span")
      statusNode.className = "mention-ticket-status"
      statusNode.textContent = formatStatusLabel(status)
      anchor.appendChild(statusNode)
    }

    const hydrateTicketStatusBadges = () => {
      const ticketAnchors = Array.from(
        document.querySelectorAll(
          "a[data-mention-badge='true'][data-mention-type='ticket']:not([data-ticket-status])"
        )
      ) as HTMLAnchorElement[]

      const anchorsBySlug = new Map<string, HTMLAnchorElement[]>()
      ticketAnchors.forEach((anchor) => {
        const slug = parseTicketSlugFromHref(anchor.getAttribute("href"))
        if (!slug) return
        const existing = anchorsBySlug.get(slug) || []
        existing.push(anchor)
        anchorsBySlug.set(slug, existing)
      })

      anchorsBySlug.forEach((anchors, slug) => {
        const cachedStatus = statusCache.get(slug)
        if (cachedStatus) {
          anchors.forEach((anchor) => applyTicketStatusBadge(anchor, cachedStatus))
          return
        }

        if (statusInFlight.has(slug)) return
        statusInFlight.add(slug)
        fetch(`/api/tickets/by-display-id/${encodeURIComponent(slug)}`)
          .then(async (response) => {
            if (!response.ok) return null
            const payload = await response.json().catch(() => null)
            const status = payload?.ticket?.status
            if (!status || typeof status !== "string") return null
            return status
          })
          .then((status) => {
            if (!status) return
            statusCache.set(slug, status)
            const currentAnchors = Array.from(
              document.querySelectorAll(
                "a[data-mention-badge='true'][data-mention-type='ticket']:not([data-ticket-status])"
              )
            ) as HTMLAnchorElement[]
            currentAnchors.forEach((anchor) => {
              const anchorSlug = parseTicketSlugFromHref(anchor.getAttribute("href"))
              if (anchorSlug !== slug) return
              applyTicketStatusBadge(anchor, status)
            })
          })
          .finally(() => {
            statusInFlight.delete(slug)
          })
      })
    }

    const scheduleHydrate = () => {
      if (hydrateScheduled) return
      hydrateScheduled = true
      requestAnimationFrame(() => {
        hydrateScheduled = false
        hydrateTicketStatusBadges()
      })
    }

    const mutationObserver = new MutationObserver(() => {
      scheduleHydrate()
    })
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const copyButton = target?.closest?.("[data-code-copy='true']") as HTMLElement | null
      if (!copyButton) return

      event.preventDefault()

      const codeValue = copyButton.getAttribute("data-code-value") || ""
      if (!codeValue.trim()) {
        toast("No code to copy", "error")
        return
      }

      if (!navigator?.clipboard?.writeText) {
        toast("Clipboard not available", "error")
        return
      }

      navigator.clipboard
        .writeText(codeValue)
        .then(() => toast("Code copied"))
        .catch(() => toast("Failed to copy code", "error"))
    }

    scheduleHydrate()
    document.addEventListener("click", handleClick)
    return () => {
      mutationObserver.disconnect()
      document.removeEventListener("click", handleClick)
    }
  }, [])

  return null
}
