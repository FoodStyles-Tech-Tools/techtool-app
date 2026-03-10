"use client"

import { PageHeader } from "@/components/ui/page-header"

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Workspace"
        description="Manage shared workflow entities used across projects."
      />
      <section className="min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="h-full overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  )
}
