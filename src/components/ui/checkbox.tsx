import * as React from "react"

import { cn } from "@client/lib/utils"
import { focusRing } from "@client/lib/form-styles"

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
          "h-4 w-4 rounded border-input text-foreground disabled:cursor-not-allowed disabled:opacity-50",
          focusRing,
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
        className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground"
      >
        {input}
        {label}
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
