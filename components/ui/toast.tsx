"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Toast {
  id: string
  message: string
  type: "success" | "error"
}

let toastId = 0
const listeners: Array<(toasts: Toast[]) => void> = []
let toasts: Toast[] = []

function addToast(message: string, type: "success" | "error" = "success") {
  const id = `toast-${++toastId}`
  const newToast: Toast = { id, message, type }
  toasts = [...toasts, newToast]
  listeners.forEach((listener) => listener(toasts))

  // Auto remove after 3 seconds
  setTimeout(() => {
    removeToast(id)
  }, 3000)
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  listeners.forEach((listener) => listener(toasts))
}

export function toast(message: string, type: "success" | "error" = "success") {
  addToast(message, type)
}

export function useToast() {
  const [toastList, setToastList] = useState<Toast[]>(toasts)

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToastList(newToasts)
    }
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return toastList
}

export function Toaster() {
  const toasts = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg",
            toast.type === "success" && "border-green-500/50 bg-green-50 dark:bg-green-950",
            toast.type === "error" && "border-red-500/50 bg-red-50 dark:bg-red-950"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
          <p
            className={cn(
              "text-sm",
              toast.type === "success" && "text-green-900 dark:text-green-100",
              toast.type === "error" && "text-red-900 dark:text-red-100"
            )}
          >
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-auto rounded-md p-1 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}






