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


