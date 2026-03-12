import { Inbox, AlertCircle } from "lucide-react"

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
    return null
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-300" />
          <div>
            <p className="text-sm font-semibold text-red-700">Something went wrong</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <Inbox className="h-10 w-10 text-slate-300" />
          <div>
            <p className="text-sm font-semibold text-slate-900">{emptyTitle}</p>
            <p className="mt-1 text-sm text-slate-500">{emptyDescription}</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
