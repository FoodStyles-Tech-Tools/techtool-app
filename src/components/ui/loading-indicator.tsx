import { cn } from "@client/lib/utils"

export type LoadingIndicatorSize = "xs" | "sm" | "md" | "lg"
export type LoadingIndicatorVariant = "inline" | "block" | "page"

export type LoadingIndicatorProps = {
  variant?: LoadingIndicatorVariant
  /**
   * Visual size of the spinner.
   * Defaults: inline→sm, block→md, page→lg
   */
  size?: LoadingIndicatorSize
  /** Accessible label. Also shown as text in block/page variants. */
  label?: string
  className?: string
}

const sizeClasses: Record<LoadingIndicatorSize, string> = {
  xs: "h-3.5 w-3.5 border-[1.5px]",
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-11 w-11 border-[2.5px]",
}

const defaultSizeByVariant: Record<LoadingIndicatorVariant, LoadingIndicatorSize> = {
  inline: "sm",
  block: "md",
  page: "lg",
}

function Spinner({
  size,
  className,
}: {
  size: LoadingIndicatorSize
  className?: string
}) {
  return (
    <div
      className={cn(
        "loading-spinner shrink-0 rounded-full border-muted-foreground/20 border-t-primary",
        sizeClasses[size],
        className
      )}
      aria-hidden
    />
  )
}

export function LoadingIndicator({
  variant = "inline",
  size,
  label = "Loading…",
  className,
}: LoadingIndicatorProps) {
  const resolvedSize = size ?? defaultSizeByVariant[variant]

  if (variant === "page") {
    return (
      <div
        role="status"
        aria-label={label}
        className={cn("loading-fade-in flex flex-col items-center justify-center gap-5", className)}
      >
        {/* Layered sonar rings + spinner */}
        <div className="relative flex items-center justify-center">
          {/* Outer sonar ring (first wave) */}
          <div className="loading-ring absolute h-[72px] w-[72px] rounded-full border border-primary/25" />
          {/* Inner sonar ring (second wave, offset) */}
          <div className="loading-ring-delayed absolute h-[72px] w-[72px] rounded-full border border-primary/15" />
          {/* Static soft halo behind the spinner */}
          <div className="absolute h-16 w-16 rounded-full bg-primary/5" />
          <Spinner size={resolvedSize} />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  if (variant === "block") {
    return (
      <div
        role="status"
        aria-label={label}
        className={cn("loading-fade-in flex flex-col items-center justify-center gap-3", className)}
      >
        <Spinner size={resolvedSize} />
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  // inline — spinner only, no label text
  return (
    <span role="status" aria-label={label} className={cn("inline-flex shrink-0", className)}>
      <Spinner size={resolvedSize} />
      <span className="sr-only">{label}</span>
    </span>
  )
}
