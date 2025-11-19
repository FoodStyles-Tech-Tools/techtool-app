"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  onCancel?: () => void
  disabled?: boolean
  placeholder?: string
  className?: string
  hideIcon?: boolean
}

export function DateTimePicker({
  value,
  onChange,
  onCancel,
  disabled = false,
  placeholder = "Pick a date and time",
  className,
  hideIcon = false,
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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : null
    if (newDate && !isNaN(newDate.getTime())) {
      // Preserve time if date already exists
      if (date) {
        newDate.setHours(date.getHours())
        newDate.setMinutes(date.getMinutes())
      } else {
        // Set time from time input
        const [hours, minutes] = time.split(":").map(Number)
        newDate.setHours(hours || 0)
        newDate.setMinutes(minutes || 0)
      }
      setDate(newDate)
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
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

  // Initialize with current value when popover opens
  React.useEffect(() => {
    if (open) {
      setDate(value)
      if (value) {
        const hours = String(value.getHours()).padStart(2, "0")
        const minutes = String(value.getMinutes()).padStart(2, "0")
        setTime(`${hours}:${minutes}`)
      } else {
        setTime("00:00")
      }
    }
  }, [open, value])

  // Handle Escape key to cancel
  React.useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Reset to original value
        setDate(value)
        if (value) {
          const hours = String(value.getHours()).padStart(2, "0")
          const minutes = String(value.getMinutes()).padStart(2, "0")
          setTime(`${hours}:${minutes}`)
        } else {
          setTime("00:00")
        }
        setOpen(false)
        onCancel?.()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open, value, onCancel])

  const handleClear = () => {
    setDate(null)
    setTime("00:00")
    onChange(null)
    setOpen(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && open) {
      // When closing without applying (clicking outside), reset to original value
      setDate(value)
      if (value) {
        const hours = String(value.getHours()).padStart(2, "0")
        const minutes = String(value.getMinutes()).padStart(2, "0")
        setTime(`${hours}:${minutes}`)
      } else {
        setTime("00:00")
      }
      // Only call onCancel if we're actually closing (not opening)
      onCancel?.()
    }
    setOpen(newOpen)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[180px] justify-start text-left font-normal h-7 text-xs",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {!hideIcon && <CalendarIcon className="mr-2 h-3 w-3" />}
          {value ? format(value, "MMM d, yyyy HH:mm") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
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
            <label className="text-xs font-medium flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Time
            </label>
            <Input
              type="time"
              value={time}
              onChange={handleTimeChange}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 px-2 text-xs"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="h-7 px-3 text-xs"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

