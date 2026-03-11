import * as React from "react"

import { cn } from "@client/lib/utils"

type CheckboxProps = Omit<React.ComponentProps<"input">, "type"> & {
  label?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const input = (
      <input
        type="checkbox"
        id={id}
        className={cn(
          "h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )

    if (!label) return input

    return (
      <label
        htmlFor={id}
        className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-600"
      >
        {input}
        {label}
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
