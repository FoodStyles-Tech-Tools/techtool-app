import { InboxIcon, ExclamationCircleIcon } from "@heroicons/react/20/solid"

export type DataStateProps = {
  loading?: boolean
  error?: string | null
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  loadingTitle?: string
  loadingDescription?: string
  children: React.ReactNode
}

export function DataState({
  loading,
  error,
  isEmpty,
  emptyTitle = "No data found",
  emptyDescription = "There is nothing to show yet.",
  loadingTitle: _loadingTitle,
  loadingDescription: _loadingDescription,
  children,
}: DataStateProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-8">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-card p-8 text-center shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <ExclamationCircleIcon className="h-10 w-10 text-red-300" />
          <div>
            <p className="text-sm font-semibold text-red-700">Something went wrong</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <InboxIcon className="h-10 w-10 text-muted-foreground/70" />
          <div>
            <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
