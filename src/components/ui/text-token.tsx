import * as React from "react"
import { cn } from "@client/lib/utils"

type TextTokenProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "danger"
}

const toneClasses: Record<NonNullable<TextTokenProps["tone"]>, string> = {
  default: "border-slate-200 bg-slate-50 text-slate-600",
  danger: "border-red-200 bg-red-50 text-red-700",
}

export function TextToken({
  className,
  children,
  tone = "default",
  ...props
}: TextTokenProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
