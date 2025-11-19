"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useProjects } from "@/hooks/use-projects"
import { useTickets } from "@/hooks/use-tickets"
import { FolderKanban, Ticket } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { TicketDetailDialog } from "@/components/ticket-detail-dialog"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const { data: projectsData, isLoading: projectsLoading } = useProjects({ limit: 5 })
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets({ limit: 10 })
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)

  const projects = projectsData || []
  const tickets = ticketsData || []
  // Only show loading if we have no data at all (not just when fetching)
  const loading = (!projectsData && projectsLoading) || (!ticketsData && ticketsLoading)

  const projectCounts = {
    open: projects.filter((p) => p.status === "open").length,
    in_progress: projects.filter((p) => p.status === "in_progress").length,
    closed: projects.filter((p) => p.status === "closed").length,
  }

  const ticketCounts = {
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    blocked: tickets.filter((t) => t.status === "blocked").length,
    completed: tickets.filter((t) => t.status === "completed").length,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of your projects and tickets
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs text-muted-foreground">Total Projects</CardTitle>
            <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl">{projects.length}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {projectCounts.open} open, {projectCounts.in_progress} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs text-muted-foreground">Total Tickets</CardTitle>
            <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl">{tickets.length}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ticketCounts.open} open, {ticketCounts.in_progress} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs text-muted-foreground">Active Projects</CardTitle>
            <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl">
              {projectCounts.open + projectCounts.in_progress}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Currently active</p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs text-muted-foreground">Completed Tickets</CardTitle>
            <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl">{ticketCounts.completed}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Finished this period</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border">
          <CardHeader className="px-4 pt-4 pb-3">
            <CardTitle className="text-sm">Recent Projects</CardTitle>
            <CardDescription className="text-xs">Your most recent projects</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <p className="text-xs text-muted-foreground">No projects yet</p>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block rounded-md border p-2.5 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm">{project.name}</h3>
                        {project.description && (
                          <p className="text-xs text-muted-foreground">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(project.created_at), "MMM d")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="px-4 pt-4 pb-3">
            <CardTitle className="text-sm">Recent Tickets</CardTitle>
            <CardDescription className="text-xs">Latest tickets across all projects</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tickets yet</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="block w-full text-left rounded-md border p-2.5 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm">{ticket.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {ticket.project?.name || "No Project"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ticket.created_at), "MMM d")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <TicketDetailDialog
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicketId(null)
          }
        }}
      />
    </div>
  )
}

