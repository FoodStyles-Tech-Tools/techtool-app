"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface UseKanbanDragOptions {
  view: "table" | "kanban"
  canEditTickets: boolean
  /** Return true to show "landed" animation; false when drop was deferred (e.g. cancel dialog). */
  onDrop: (ticketId: string, columnId: string) => Promise<boolean>
}

export function useKanbanDrag({ view, canEditTickets, onDrop }: UseKanbanDragOptions) {
  const [draggedTicket, setDraggedTicket] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<{
    columnId: string
    ticketId: string | null
    top: number
  } | null>(null)
  const [justDroppedTicketId, setJustDroppedTicketId] = useState<string | null>(null)

  const kanbanScrollRef = useRef<HTMLDivElement>(null)
  const kanbanTopScrollRef = useRef<HTMLDivElement>(null)
  const kanbanSyncingRef = useRef<"top" | "board" | null>(null)
  const autoScrollVelocityRef = useRef(0)
  const autoScrollFrameRef = useRef<number | null>(null)
  const [kanbanScrollTrackWidth, setKanbanScrollTrackWidth] = useState(0)

  const stopAutoScroll = useCallback(() => {
    autoScrollVelocityRef.current = 0
    if (autoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(autoScrollFrameRef.current)
      autoScrollFrameRef.current = null
    }
  }, [])

  const runAutoScroll = useCallback(() => {
    const container = kanbanScrollRef.current
    if (!container || !draggedTicket || autoScrollVelocityRef.current === 0) {
      autoScrollFrameRef.current = null
      return
    }
    container.scrollLeft += autoScrollVelocityRef.current
    autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScroll)
  }, [draggedTicket])

  const updateAutoScroll = useCallback((clientX: number) => {
    const container = kanbanScrollRef.current
    if (!container || !draggedTicket) {
      stopAutoScroll()
      return
    }
    const rect = container.getBoundingClientRect()
    const edgeThreshold = Math.min(140, rect.width * 0.25)
    const maxSpeed = 24
    const minSpeed = 6
    let velocity = 0
    if (clientX < rect.left + edgeThreshold) {
      const strength = Math.min(1, (rect.left + edgeThreshold - clientX) / edgeThreshold)
      velocity = -(minSpeed + (maxSpeed - minSpeed) * strength)
    } else if (clientX > rect.right - edgeThreshold) {
      const strength = Math.min(1, (clientX - (rect.right - edgeThreshold)) / edgeThreshold)
      velocity = minSpeed + (maxSpeed - minSpeed) * strength
    }
    autoScrollVelocityRef.current = velocity
    if (velocity !== 0) {
      if (autoScrollFrameRef.current === null) {
        autoScrollFrameRef.current = window.requestAnimationFrame(runAutoScroll)
      }
    } else {
      stopAutoScroll()
    }
  }, [draggedTicket, runAutoScroll, stopAutoScroll])

  const refreshKanbanTrackWidth = useCallback(() => {
    if (kanbanScrollRef.current) {
      setKanbanScrollTrackWidth(kanbanScrollRef.current.scrollWidth)
    }
  }, [])

  const syncKanbanScroll = useCallback((source: "top" | "board", scrollLeft: number) => {
    if (kanbanSyncingRef.current && kanbanSyncingRef.current !== source) return
    kanbanSyncingRef.current = source
    if (source === "top") {
      if (kanbanScrollRef.current) kanbanScrollRef.current.scrollLeft = scrollLeft
    } else {
      if (kanbanTopScrollRef.current) kanbanTopScrollRef.current.scrollLeft = scrollLeft
    }
    window.requestAnimationFrame(() => {
      if (kanbanSyncingRef.current === source) kanbanSyncingRef.current = null
    })
  }, [])

  useEffect(() => {
    if (!draggedTicket) stopAutoScroll()
    return () => stopAutoScroll()
  }, [draggedTicket, stopAutoScroll])

  useEffect(() => {
    if (view !== "kanban") return
    refreshKanbanTrackWidth()
    const container = kanbanScrollRef.current
    if (!container) return
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => refreshKanbanTrackWidth())
        : null
    resizeObserver?.observe(container)
    const firstChild = container.firstElementChild
    if (firstChild) resizeObserver?.observe(firstChild)
    const handleResize = () => refreshKanbanTrackWidth()
    window.addEventListener("resize", handleResize)
    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener("resize", handleResize)
    }
  }, [view, refreshKanbanTrackWidth])

  useEffect(() => {
    if (!draggedTicket) return
    const handleGlobalDragOver = (e: DragEvent) => updateAutoScroll(e.clientX)
    const handleGlobalDragStop = () => stopAutoScroll()
    window.addEventListener("dragover", handleGlobalDragOver)
    window.addEventListener("drop", handleGlobalDragStop)
    window.addEventListener("dragend", handleGlobalDragStop)
    return () => {
      window.removeEventListener("dragover", handleGlobalDragOver)
      window.removeEventListener("drop", handleGlobalDragStop)
      window.removeEventListener("dragend", handleGlobalDragStop)
    }
  }, [draggedTicket, stopAutoScroll, updateAutoScroll])

  const handleDragStart = useCallback(
    (e: React.DragEvent, ticketId: string) => {
      if (!canEditTickets) return
      setDragOverColumn(null)
      setDropIndicator(null)
      setDraggedTicket(ticketId)
      e.dataTransfer.effectAllowed = "move"
    },
    [canEditTickets]
  )

  const handleDragEnd = useCallback(() => {
    stopAutoScroll()
    setDraggedTicket(null)
    setDragOverColumn(null)
    setDropIndicator(null)
  }, [stopAutoScroll])

  const handleDragOver = useCallback(
    (e: React.DragEvent, columnId: string) => {
      if (!draggedTicket) return
      e.preventDefault()
      e.stopPropagation()
      updateAutoScroll(e.clientX)
      setDragOverColumn(columnId)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setDropIndicator({ columnId, ticketId: null, top: e.clientY - rect.top })
    },
    [draggedTicket, updateAutoScroll]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as Node | null
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) return
    stopAutoScroll()
    setDragOverColumn(null)
    setDropIndicator(null)
  }, [stopAutoScroll])

  const handleDrop = useCallback(
    async (e: React.DragEvent, columnId: string) => {
      e.preventDefault()
      e.stopPropagation()
      if (!draggedTicket) return
      stopAutoScroll()
      try {
        const showLanded = await onDrop(draggedTicket, columnId)
        if (showLanded) {
          setJustDroppedTicketId(draggedTicket)
          window.setTimeout(() => {
            setJustDroppedTicketId((prev) => (prev === draggedTicket ? null : prev))
          }, 550)
        }
      } finally {
        setDraggedTicket(null)
        setDragOverColumn(null)
        setDropIndicator(null)
      }
    },
    [draggedTicket, onDrop, stopAutoScroll]
  )

  return {
    draggedTicket,
    dragOverColumn,
    dropIndicator,
    justDroppedTicketId,
    setJustDroppedTicketId,
    kanbanScrollRef,
    kanbanTopScrollRef,
    kanbanScrollTrackWidth,
    refreshKanbanTrackWidth,
    syncKanbanScroll,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}
