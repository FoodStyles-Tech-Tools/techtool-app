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

export function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  )
}
