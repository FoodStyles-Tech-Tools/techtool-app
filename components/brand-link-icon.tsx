"use client"

import {
  Calendar,
  CheckCircle2,
  Figma,
  FileSpreadsheet,
  FileText,
  Github,
  HardDrive,
  KanbanSquare,
  LineChart,
  Link2,
  NotebookText,
  Presentation,
  Slack,
  Trello,
  Triangle,
  Video,
} from "lucide-react"

interface BrandLinkIconProps {
  url: string
  className?: string
}

const getBrandIcon = (url: string) => {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname.toLowerCase()

    if (host === "github.com" || host.endsWith(".github.com")) return Github
    if (host === "vercel.com" || host.endsWith(".vercel.app")) return Triangle
    if (host === "notion.so" || host.endsWith(".notion.so")) return NotebookText
    if (host === "linear.app") return LineChart
    if (host === "trello.com") return Trello
    if (host === "asana.com") return CheckCircle2
    if (host === "figma.com") return Figma
    if (host === "slack.com") return Slack
    if (host.endsWith("atlassian.net") || host === "jira.com") return KanbanSquare

    if (host === "calendar.google.com" || path.includes("/calendar")) return Calendar
    if (host === "meet.google.com") return Video
    if (host === "drive.google.com") return HardDrive
    if (host === "docs.google.com") {
      if (path.includes("spreadsheets")) return FileSpreadsheet
      if (path.includes("presentation")) return Presentation
      if (path.includes("document")) return FileText
      return FileText
    }
    if (host === "sheets.google.com") return FileSpreadsheet
  } catch {
    return Link2
  }

  return Link2
}

export function BrandLinkIcon({ url, className }: BrandLinkIconProps) {
  const Icon = getBrandIcon(url)
  return <Icon className={className} />
}
