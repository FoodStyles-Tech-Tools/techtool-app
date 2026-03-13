import * as React from "react"

import { selectClassName } from "@client/lib/form-styles"
import { cn } from "@client/lib/utils"

const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={cn(selectClassName, className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Select.displayName = "Select"

export { Select }
