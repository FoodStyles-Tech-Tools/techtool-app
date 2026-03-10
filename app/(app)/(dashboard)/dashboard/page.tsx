"use client"

import Link from "next/link"
import { FolderOpen, Box, ClipboardList, Timer, FileSpreadsheet, Shield } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { EntityPageLayout } from "@/components/ui/entity-page-layout"
import { ContentCard } from "@/components/ui/content-card"
import { usePermissions } from "@/hooks/use-permissions"

const sections = [
  { href: "/projects", title: "Projects", description: "Manage project metadata and ownership.", icon: FolderOpen, flag: "canViewProjects" as const },
  { href: "/assets", title: "Assets", description: "Browse and update shared assets.", icon: Box, flag: "canViewAssets" as const },
  { href: "/tickets", title: "Tickets", description: "Track work across table, kanban, and gantt views.", icon: ClipboardList, flag: "canViewTickets" as const },
  { href: "/clockify", title: "Clockify", description: "Review imported work sessions and reconciliation.", icon: Timer, flag: "canViewClockify" as const },
  { href: "/report/guild-lead-report", title: "Report", description: "Review ticket reporting sessions.", icon: FileSpreadsheet, flag: "canViewClockify" as const },
  { href: "/users", title: "Admin", description: "Manage users, roles, and workspace settings.", icon: Shield, flag: "canViewUsers" as const },
]

export default function DashboardPage() {
  const { flags } = usePermissions()
  const visibleSections = sections.filter((section) => !section.flag || flags?.[section.flag])

  return (
    <EntityPageLayout
      header={
        <PageHeader
          title="Dashboard"
          description="Use the shortcuts below to move through the core areas of the workspace."
        />
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleSections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <ContentCard className="h-full p-5 transition-colors hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className="rounded-md border border-slate-200 p-2">
                    <Icon className="h-5 w-5 text-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                    <p className="text-sm text-slate-500">{section.description}</p>
                  </div>
                </div>
              </ContentCard>
            </Link>
          )
        })}
      </div>
    </EntityPageLayout>
  )
}
