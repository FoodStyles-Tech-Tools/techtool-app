import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type BlockingLoaderProps = {
  title?: string
  description?: string
  className?: string
}

export function BlockingLoader({
  title = "Loading",
  description = "Please wait while the page is prepared.",
  className,
}: BlockingLoaderProps) {
  return (
    <div className={cn("flex min-h-[280px] items-center justify-center rounded-lg border border-slate-200 bg-white p-8", className)}>
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  )
}
