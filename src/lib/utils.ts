import * as React from "react"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateText(text: string, maxLength = 20) {
  if (!text) return text
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

export function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === "function") {
        ref(node)
      } else {
        ;(ref as React.MutableRefObject<T | null>).current = node
      }
    }
  }
}


