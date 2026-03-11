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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  )
}

export function RouteLoadingFallback() {
  return (
    <FullScreenMessage
      title="Loading route"
      description="Preparing the page module."
    />
  )
}
