import type { ComponentType, SVGProps } from "react"
import {
  ArrowDownIcon,
  Bars3Icon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/20/solid"

export const PRIORITY_ORDER = ["low", "medium", "high", "urgent"] as const
export type PriorityKey = (typeof PRIORITY_ORDER)[number]

export const PRIORITY_COLOR: Record<PriorityKey, string> = {
  low: "#3b82f6",
  medium: "#f59e0b",
  high: "#ef4444",
  urgent: "#ef4444", // same as high so visible in dark mode; icon (ExclamationTriangle) distinguishes
}

export const PRIORITY_LABEL: Record<PriorityKey, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

const PRIORITY_ICONS: Record<PriorityKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  low: ArrowDownIcon,
  medium: Bars3Icon,
  high: ArrowUpIcon,
  urgent: ExclamationTriangleIcon,
}

export function normalizePriorityKey(value: string | null | undefined): PriorityKey {
  const key = (value ?? "").trim().toLowerCase()
  if (PRIORITY_ORDER.includes(key as PriorityKey)) {
    return key as PriorityKey
  }
  return "medium"
}

export function getPriorityConfig(priority: string) {
  const key = normalizePriorityKey(priority)
  return {
    key,
    label: PRIORITY_LABEL[key],
    color: PRIORITY_COLOR[key],
    Icon: PRIORITY_ICONS[key],
  }
}
