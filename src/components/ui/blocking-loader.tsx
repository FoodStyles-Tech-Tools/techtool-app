import { cn } from "@client/lib/utils"
import { LoadingPill } from "@client/components/ui/loading-pill"

type BlockingLoaderProps = {
  title?: string
  description?: string
  className?: string
}

export function BlockingLoader({
  title = "Loading...",
  description: _description,
  className,
}: BlockingLoaderProps) {
  return (
    <div className={cn("flex min-h-[280px] items-center justify-center", className)}>
      <LoadingPill label={title} />
    </div>
  )
}
