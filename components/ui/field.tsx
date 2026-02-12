"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type FieldGroupProps = React.HTMLAttributes<HTMLDivElement>

export function FieldGroup({ className, ...props }: FieldGroupProps) {
  return <div className={cn("grid gap-3", className)} {...props} />
}

type FieldProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "vertical" | "horizontal"
}

export function Field({ className, orientation = "vertical", ...props }: FieldProps) {
  return (
    <div
      className={cn(
        orientation === "horizontal" ? "flex items-center gap-2" : "grid gap-2",
        className
      )}
      {...props}
    />
  )
}

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label ref={ref} className={cn(className)} {...props} />
))
FieldLabel.displayName = "FieldLabel"

export { FieldLabel }

