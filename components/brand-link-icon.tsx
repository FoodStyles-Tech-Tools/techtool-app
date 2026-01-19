"use client"

import {
  SiAsana,
  SiFigma,
  SiGithub,
  SiGooglecalendar,
  SiGoogledocs,
  SiGoogledrive,
  SiGooglemeet,
  SiGooglesheets,
  SiGoogleslides,
  SiJira,
  SiLinear,
  SiNotion,
  SiSlack,
  SiTrello,
  SiVercel,
} from "react-icons/si"
import { Link2 } from "lucide-react"

interface BrandLinkIconProps {
  url: string
  className?: string
}

const getBrandIcon = (url: string) => {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname.toLowerCase()

    if (host === "github.com" || host.endsWith(".github.com")) return SiGithub
    if (host === "vercel.com" || host.endsWith(".vercel.app")) return SiVercel
    if (host === "notion.so" || host.endsWith(".notion.so")) return SiNotion
    if (host === "linear.app") return SiLinear
    if (host === "trello.com") return SiTrello
    if (host === "asana.com") return SiAsana
    if (host === "figma.com") return SiFigma
    if (host === "slack.com") return SiSlack
    if (host.endsWith("atlassian.net") || host === "jira.com") return SiJira

    if (host === "calendar.google.com" || path.includes("/calendar")) return SiGooglecalendar
    if (host === "meet.google.com") return SiGooglemeet
    if (host === "drive.google.com") return SiGoogledrive
    if (host === "docs.google.com") {
      if (path.includes("spreadsheets")) return SiGooglesheets
      if (path.includes("presentation")) return SiGoogleslides
      if (path.includes("document")) return SiGoogledocs
      return SiGoogledocs
    }
    if (host === "sheets.google.com") return SiGooglesheets
  } catch {
    return Link2
  }

  return Link2
}

export function BrandLinkIcon({ url, className }: BrandLinkIconProps) {
  const Icon = getBrandIcon(url)
  return <Icon className={className} />
}
