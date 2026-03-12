import { LoadingIndicator } from "@client/components/ui/loading-indicator"

export function FullScreenMessage({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="max-w-md w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  )
}

/** Full-screen page loader — used as a Suspense fallback for lazy routes */
export function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <LoadingIndicator variant="page" />
    </div>
  )
}

/** Content-area loader — used inside pages while initial data is fetching */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <LoadingIndicator variant="page" label={label ?? "Loading…"} />
    </div>
  )
}
