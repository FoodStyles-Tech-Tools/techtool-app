"use client"

import * as React from "react"
import { format } from "date-fns"
import { Button } from "@client/components/ui/button"
import { Input } from "@client/components/ui/input"
import { cn } from "@client/lib/utils"

interface DateTimePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  onCancel?: () => void
  disabled?: boolean
  placeholder?: string
  className?: string
  hideIcon?: boolean
  renderTriggerContent?: (value: Date | null) => React.ReactNode
}

export function DateTimePicker({
  value,
  onChange,
  onCancel,
  disabled = false,
  placeholder = "Pick a date and time",
  className,
  hideIcon = false,
  renderTriggerContent,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | null>(value)
  const [time, setTime] = React.useState<string>(() => {
    if (value) {
      const hours = String(value.getHours()).padStart(2, "0")
      const minutes = String(value.getMinutes()).padStart(2, "0")
      return `${hours}:${minutes}`
    }
    return "00:00"
  })
  const panelRef = React.useRef<HTMLDivElement | null>(null)

  const resetDraft = React.useCallback(() => {
    setDate(value)
    if (value) {
      const hours = String(value.getHours()).padStart(2, "0")
      const minutes = String(value.getMinutes()).padStart(2, "0")
      setTime(`${hours}:${minutes}`)
      return
    }

    setTime("00:00")
  }, [value])

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && open) {
        resetDraft()
        onCancel?.()
      }
      setOpen(nextOpen)
    },
    [onCancel, open, resetDraft]
  )

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value ? new Date(event.target.value) : null
    if (newDate && !isNaN(newDate.getTime())) {
      if (date) {
        newDate.setHours(date.getHours())
        newDate.setMinutes(date.getMinutes())
      } else {
        const [hours, minutes] = time.split(":").map(Number)
        newDate.setHours(hours || 0)
        newDate.setMinutes(minutes || 0)
      }
      setDate(newDate)
    }
  }

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = event.target.value
    setTime(newTime)
    if (date) {
      const [hours, minutes] = newTime.split(":").map(Number)
      const newDate = new Date(date)
      newDate.setHours(hours || 0)
      newDate.setMinutes(minutes || 0)
      setDate(newDate)
    }
  }

  const handleApply = () => {
    if (date) {
      const [hours, minutes] = time.split(":").map(Number)
      const finalDate = new Date(date)
      finalDate.setHours(hours || 0)
      finalDate.setMinutes(minutes || 0)
      onChange(finalDate)
    } else {
      onChange(null)
    }
    setOpen(false)
  }

  React.useEffect(() => {
    if (open) {
      resetDraft()
    }
  }, [open, resetDraft])

  React.useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        handleOpenChange(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleOpenChange(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [handleOpenChange, open])

  const handleClear = () => {
    setDate(null)
    setTime("00:00")
    onChange(null)
    setOpen(false)
  }

  return (
    <div ref={panelRef} className="relative inline-flex">
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-7 w-[180px] justify-start text-left text-xs font-normal",
          !value && !renderTriggerContent && "text-muted-foreground",
          className
        )}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {!hideIcon ? <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</span> : null}
        {renderTriggerContent
          ? renderTriggerContent(value)
          : value
            ? format(value, "MMM d, yyyy HH:mm")
            : <span>{placeholder}</span>}
      </Button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-md border border-border bg-card p-3 shadow-md">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium">Date</label>
              <Input
                type="date"
                value={date ? format(date, "yyyy-MM-dd") : ""}
                onChange={handleDateChange}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Time</label>
              <Input
                type="time"
                value={time}
                onChange={handleTimeChange}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 px-2 text-xs"
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                className="h-7 px-3 text-xs"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
