/**
 * Date formatting helpers for tickets and other UI.
 */

export type DueDateDisplay = {
  label: string
  className: string
  title?: string
  highlightClassName?: string
}

const dueDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
})

function normalizeToStartOfDay(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffDays === 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays >= 2 && diffDays <= 7) return `${diffDays} days ago`
  if (diffWeeks >= 1 && diffWeeks <= 4) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`
  if (diffMonths >= 1 && diffMonths <= 12) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`
  if (diffYears >= 1) return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`
  return "long time ago"
}

export function getDueDateDisplay(dueDateString?: string | null): DueDateDisplay {
  if (!dueDateString) {
    return {
      label: "No due date",
      className: "border border-muted-foreground/40 bg-muted/50 text-muted-foreground",
    }
  }

  const dueDate = new Date(dueDateString)
  if (Number.isNaN(dueDate.getTime())) {
    return {
      label: "Invalid date",
      className: "border border-muted-foreground/40 bg-muted/50 text-muted-foreground",
    }
  }

  const normalizedDueDate = normalizeToStartOfDay(dueDate)
  const today = normalizeToStartOfDay(new Date())
  const formattedDate = dueDateFormatter.format(dueDate)
  const title = dueDate.toLocaleString()
  const overdue = normalizedDueDate.getTime() < today.getTime()
  const dueToday = normalizedDueDate.getTime() === today.getTime()
  const diffDays = Math.round((normalizedDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (overdue) {
    return {
      label: `Overdue: ${formattedDate}`,
      className: "border border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-50",
      highlightClassName: "bg-red-50/70 hover:bg-red-100/70 dark:bg-red-500/10 dark:hover:bg-red-500/20",
      title,
    }
  }

  if (dueToday) {
    return {
      label: "Due today",
      className: "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-50",
      highlightClassName: "bg-orange-50/70 hover:bg-orange-100/70 dark:bg-orange-500/10 dark:hover:bg-orange-500/20",
      title,
    }
  }

  if (diffDays === 1) {
    return {
      label: "Due tomorrow",
      className: "border border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/40 dark:bg-yellow-500/20 dark:text-yellow-50",
      highlightClassName: "bg-yellow-50/70 hover:bg-yellow-100/70 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20",
      title,
    }
  }

  if (diffDays >= 2 && diffDays <= 7) {
    return {
      label: `Due in ${diffDays} day${diffDays > 1 ? "s" : ""}`,
      className: "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-50",
      highlightClassName: "bg-orange-50/70 hover:bg-orange-100/70 dark:bg-orange-500/10 dark:hover:bg-orange-500/20",
      title,
    }
  }

  return {
    label: `Due ${formattedDate}`,
    className: "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-50",
    title,
  }
}

/** Format a Date for API (UTC ISO string preserving local date/time). */
export function toUTCISOStringPreserveLocal(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString()
}
