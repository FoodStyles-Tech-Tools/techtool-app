"use client"

import * as React from "react"

import { cn } from "@client/lib/utils"

type AvatarStatus = "idle" | "loaded" | "error"

type AvatarContextValue = {
  imageStatus: AvatarStatus
  setImageStatus: (status: AvatarStatus) => void
}

const AvatarContext = React.createContext<AvatarContextValue | null>(null)

function useAvatarContext() {
  return React.useContext(AvatarContext)
}

const Avatar = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    const [imageStatus, setImageStatus] = React.useState<AvatarStatus>("idle")

    return (
      <AvatarContext.Provider value={{ imageStatus, setImageStatus }}>
        <span
          ref={ref}
          className={cn(
            "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
            className
          )}
          {...props}
        />
      </AvatarContext.Provider>
    )
  }
)
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, onLoad, onError, alt = "", ...props }, ref) => {
  const context = useAvatarContext()

  return (
    <img
      ref={ref}
      alt={alt}
      className={cn(
        "aspect-square h-full w-full object-cover",
        context?.imageStatus === "loaded" ? "block" : "hidden",
        className
      )}
      onLoad={(event) => {
        context?.setImageStatus("loaded")
        onLoad?.(event)
      }}
      onError={(event) => {
        context?.setImageStatus("error")
        onError?.(event)
      }}
      {...props}
    />
  )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  const context = useAvatarContext()

  if (context?.imageStatus === "loaded") {
    return null
  }

  return (
    <span
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-slate-200",
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
