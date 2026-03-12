/**
 * Shared minimal loading UI: spinner only (inline) or spinner + label (block).
 * CSS-only; no heavy animation libs.
 */
type LoadingIndicatorProps = {
  /** When true, show spinner + "Loading…" in a block layout. When false, spinner only. */
  variant?: "inline" | "block"
  /** Optional label (used only in block variant). Default "Loading…" */
  label?: string
}

export function LoadingIndicator({
  variant = "inline",
  label = "Loading…",
}: LoadingIndicatorProps) {
  const spinner = (
    <div
      className="loading-spinner h-8 w-8 shrink-0 rounded-full border-2 border-muted-foreground/30 border-t-primary"
      aria-hidden
    />
  )

  if (variant === "inline") {
    return spinner
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {spinner}
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
