import { BlockingLoader } from "@client/components/ui/blocking-loader"

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
  loadingTitle,
  loadingDescription,
  children,
}: DataStateProps) {
  if (loading) {
    return <BlockingLoader title={loadingTitle} description={loadingDescription} />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-700">Something went wrong</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-900">{emptyTitle}</p>
        <p className="mt-1 text-sm text-slate-500">{emptyDescription}</p>
      </div>
    )
  }

  return <>{children}</>
}
