"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRealtimeSubscription } from "./use-realtime"
import { useSupabaseClient } from "@/lib/supabase-client"
import { ensureUserContext, useUserEmail } from "@/lib/supabase-context"
import { prepareLinkPayload, sanitizeLinkArray } from "@/lib/links"
import type { Ticket } from "@/lib/types"

export type TicketFilterOptions = {
  project_id?: string
  assignee_id?: string
  status?: string
  department_id?: string
  requested_by_id?: string
  exclude_done?: boolean
}

function ticketMatchesFilter(
  ticket: Ticket & { project_id?: string; assignee_id?: string; department_id?: string; requested_by_id?: string },
  opts?: TicketFilterOptions
): boolean {
  if (!opts) return true
  if (opts.project_id && ticket.project_id !== opts.project_id) return false
  if (opts.assignee_id) {
    if (opts.assignee_id === "unassigned" && ticket.assignee_id) return false
    if (opts.assignee_id !== "unassigned" && ticket.assignee_id !== opts.assignee_id) return false
  }
  if (opts.status && ticket.status !== opts.status) return false
  if (opts.department_id) {
    if (opts.department_id === "no_department" && ticket.department_id) return false
    if (opts.department_id !== "no_department" && ticket.department_id !== opts.department_id) return false
  }
  if (opts.requested_by_id && ticket.requested_by_id !== opts.requested_by_id) return false
  if (opts.exclude_done && (ticket.status === "completed" || ticket.status === "cancelled")) return false
  return true
}

type TicketUpdateVariables = {
  title?: string
  description?: string
  status?: string
  priority?: string
  type?: string
  links?: string[]
  sqa_assigned_at?: string | null
  assignee_id?: string | null
  sqa_assignee_id?: string | null
  requested_by_id?: string
  department_id?: string | null
  epic_id?: string | null
  sprint_id?: string | null
}

function applyTicketUpdateVariables(
  ticket: Ticket,
  variables: TicketUpdateVariables,
  cache: {
    users?: Array<{ id: string; name: string | null; email: string; image: string | null }>
    departments?: Array<{ id: string; name: string }>
    epics?: Array<{ id: string; name: string; color: string }>
    sprints?: Array<{ id: string; name: string; status: string }>
  }
): Ticket {
  const updated: Ticket = { ...ticket }
  if (variables.title !== undefined) updated.title = variables.title
  if (variables.description !== undefined) updated.description = variables.description
  if (variables.status !== undefined) updated.status = variables.status
  if (variables.priority !== undefined) updated.priority = variables.priority
  if (variables.type !== undefined) updated.type = variables.type
  if (variables.links !== undefined) updated.links = prepareLinkPayload(variables.links)
  if (variables.sqa_assigned_at !== undefined) updated.sqa_assigned_at = variables.sqa_assigned_at
  const { users: usersData, departments: departmentsData, epics: epicsData, sprints: sprintsData } = cache
  if (variables.assignee_id !== undefined) {
    updated.assignee = variables.assignee_id && usersData
      ? (() => { const u = usersData.find(x => x.id === variables.assignee_id); return u ? { id: u.id, name: u.name, email: u.email, image: u.image } : null })()
      : null
  }
  if (variables.sqa_assignee_id !== undefined) {
    updated.sqa_assignee = variables.sqa_assignee_id && usersData
      ? (() => { const u = usersData.find(x => x.id === variables.sqa_assignee_id); return u ? { id: u.id, name: u.name, email: u.email, image: u.image } : null })()
      : null
  }
  if (variables.requested_by_id !== undefined && usersData) {
    const u = usersData.find(x => x.id === variables.requested_by_id)
    if (u) updated.requested_by = { id: u.id, name: u.name, email: u.email }
  }
  if (variables.department_id !== undefined) {
    updated.department = variables.department_id && departmentsData
      ? (() => { const d = departmentsData.find(x => x.id === variables.department_id); return d ? { id: d.id, name: d.name } : null })()
      : null
  }
  if (variables.epic_id !== undefined) {
    updated.epic = variables.epic_id && epicsData
      ? (() => { const e = epicsData.find(x => x.id === variables.epic_id); return e ? { id: e.id, name: e.name, color: e.color } : null })()
      : null
  }
  if (variables.sprint_id !== undefined) {
    updated.sprint = variables.sprint_id && sprintsData
      ? (() => { const s = sprintsData.find(x => x.id === variables.sprint_id); return s ? { id: s.id, name: s.name, status: s.status } : null })()
      : null
  }
  return updated
}

// Helper function to enrich tickets with images from auth_user
async function enrichTicketsWithImages(
  supabase: ReturnType<typeof useSupabaseClient>,
  tickets: any[]
): Promise<Ticket[]> {
  if (!tickets || tickets.length === 0) return tickets as Ticket[]
  
  // Collect all unique emails from assignees, SQA assignees, and requested_by
  const emails = new Set<string>()
  tickets.forEach(ticket => {
    if (ticket.assignee?.email) emails.add(ticket.assignee.email)
    if (ticket.sqa_assignee?.email) emails.add(ticket.sqa_assignee.email)
    if (ticket.requested_by?.email) emails.add(ticket.requested_by.email)
  })
  
  if (emails.size === 0) return tickets as Ticket[]
  
  // Fetch images from auth_user
  const { data: authUsers } = await supabase
    .from("auth_user")
    .select("email, image")
    .in("email", Array.from(emails))
  
  // Create a map of email -> image
  const imageMap = new Map<string, string | null>()
  authUsers?.forEach(au => {
    imageMap.set(au.email, au.image || null)
  })
  
  // Enrich tickets with images
  return tickets.map(ticket => ({
    ...ticket,
    links: sanitizeLinkArray(ticket.links),
    assignee: ticket.assignee ? {
      ...ticket.assignee,
      image: imageMap.get(ticket.assignee.email) || null,
    } : null,
    sqa_assignee: ticket.sqa_assignee ? {
      ...ticket.sqa_assignee,
      image: imageMap.get(ticket.sqa_assignee.email) || null,
    } : null,
    requested_by: ticket.requested_by ? {
      ...ticket.requested_by,
    } : ticket.requested_by,
  })) as Ticket[]
}

export function useTickets(options?: {
  project_id?: string
  assignee_id?: string
  status?: string
  department_id?: string
  requested_by_id?: string
  exclude_done?: boolean
  limit?: number
  page?: number
}) {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  const queryKey = ["tickets", options?.project_id, options?.assignee_id, options?.status, options?.department_id, options?.requested_by_id, options?.exclude_done, options?.limit, options?.page]

  // Real-time subscription for tickets
  useRealtimeSubscription({
    table: "tickets",
    enabled: true,
    onInsert: async (payload) => {
      const newTicketData = payload.new as any
      // Fetch full ticket with relations using Supabase
      try {
        await ensureUserContext(supabase, userEmail)
        const { data: ticket, error } = await supabase
          .from("tickets")
          .select(`
            *,
            department:departments(id, name),
            project:projects(id, name),
            assignee:users!tickets_assignee_id_fkey(id, name, email),
            sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email),
            requested_by:users!tickets_requested_by_id_fkey(id, name, email),
            epic:epics(id, name, color),
            sprint:sprints(id, name, status)
          `)
          .eq("id", newTicketData.id)
          .single()

        if (!error && ticket) {
          // Enrich with images
          const enrichedTickets = await enrichTicketsWithImages(supabase, [ticket])
          const enrichedTicket = enrichedTickets[0]
          
          if (ticketMatchesFilter(enrichedTicket as any, options)) {
            queryClient.setQueriesData<Ticket[]>(
              { queryKey: ["tickets"] },
              (old) => {
                if (!old) return old
                if (!old.some(t => t.id === enrichedTicket.id)) {
                  return [enrichedTicket, ...old]
                }
                return old
              }
            )
          }
        } else {
          console.error("[Realtime] Error fetching new ticket:", error)
        }
      } catch (error) {
        console.error("[Realtime] Error processing ticket insert:", error)
        // Fallback to invalidation
        queryClient.invalidateQueries({ queryKey: ["tickets"] })
      }
    },
    onUpdate: async (payload) => {
      const updatedTicketData = payload.new as any
      
      // Fetch full ticket with relations for accurate update
      try {
        await ensureUserContext(supabase, userEmail)
        const { data: ticket, error } = await supabase
          .from("tickets")
          .select(`
            *,
            department:departments(id, name),
            project:projects(id, name),
            assignee:users!tickets_assignee_id_fkey(id, name, email),
            sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email),
            requested_by:users!tickets_requested_by_id_fkey(id, name, email),
            epic:epics(id, name, color),
            sprint:sprints(id, name, status)
          `)
          .eq("id", updatedTicketData.id)
          .single()

        if (!error && ticket) {
          // Enrich with images
          const enrichedTickets = await enrichTicketsWithImages(supabase, [ticket])
          const enrichedTicket = enrichedTickets[0]
          
          const allQueries = queryClient.getQueriesData<Ticket[]>({ queryKey: ["tickets"] })
          for (const [queryKey, oldData] of allQueries) {
            if (!oldData) continue
            const [, project_id, assignee_id, status, department_id, requested_by_id, exclude_done] = queryKey as any[]
            const filterOptions: TicketFilterOptions = { project_id, assignee_id, status, department_id, requested_by_id, exclude_done }
            const ticketMatches = ticketMatchesFilter(enrichedTicket as any, filterOptions)
            const ticketIndex = oldData.findIndex(t => t.id === enrichedTicket.id)
            const ticketExists = ticketIndex !== -1

            if (ticketMatches) {
              // Ticket should be in this cache
              if (ticketExists) {
                // Update existing ticket
                const newTickets = [...oldData]
                newTickets[ticketIndex] = enrichedTicket
                queryClient.setQueryData<Ticket[]>(queryKey, newTickets)
              } else {
                // Add ticket to cache (it now matches filters)
                queryClient.setQueryData<Ticket[]>(queryKey, [enrichedTicket, ...oldData])
              }
            } else if (ticketExists) {
              // Ticket no longer matches filters, remove it
              queryClient.setQueryData<Ticket[]>(queryKey, oldData.filter(t => t.id !== enrichedTicket.id))
            }
          }
          
          // Always update single ticket cache
          queryClient.setQueryData<{ ticket: Ticket }>(["ticket", updatedTicketData.id], { ticket: enrichedTicket })
        } else {
          console.error("[Realtime] Error fetching updated ticket:", error)
          // Fallback: invalidate queries
          queryClient.invalidateQueries({ queryKey: ["tickets"] })
        }
      } catch (error) {
        console.error("[Realtime] Error processing ticket update:", error)
        // Fallback: invalidate queries
        queryClient.invalidateQueries({ queryKey: ["tickets"] })
      }
    },
    onDelete: (payload) => {
      const deletedId = (payload.old as { id: string }).id
      // Remove ticket from all query caches
      queryClient.setQueriesData<Ticket[]>(
        { queryKey: ["tickets"] },
        (old) => {
          if (!old) return old
          return old.filter(t => t.id !== deletedId)
        }
      )
      // Remove single ticket query
      queryClient.removeQueries({ queryKey: ["ticket", deletedId] })
    },
  })

  return useQuery<Ticket[]>({
    queryKey,
    queryFn: async () => {
      // Set user context for RLS (cached, only called once per session)
      await ensureUserContext(supabase, userEmail)

      let query = supabase
        .from("tickets")
        .select(`
          *,
          department:departments(id, name),
          project:projects(id, name),
          assignee:users!tickets_assignee_id_fkey(id, name, email),
          requested_by:users!tickets_requested_by_id_fkey(id, name, email),
          epic:epics(id, name, color),
          sprint:sprints(id, name, status)
        `)
        .order("created_at", { ascending: false })

      if (options?.project_id) {
        query = query.eq("project_id", options.project_id)
      }
      if (options?.assignee_id) {
        if (options.assignee_id === "unassigned") {
          query = query.is("assignee_id", null)
        } else {
          query = query.eq("assignee_id", options.assignee_id)
        }
      }
      if (options?.status) {
        query = query.eq("status", options.status)
      }
      if (options?.department_id !== undefined) {
        if (options.department_id === "no_department") {
          query = query.is("department_id", null)
        } else {
          query = query.eq("department_id", options.department_id)
        }
      }
      if (options?.requested_by_id) {
        query = query.eq("requested_by_id", options.requested_by_id)
      }
      // Exclude done tickets - must come after status filter to avoid conflicts
      if (options?.exclude_done) {
        // Only exclude if status filter is not already set to completed/cancelled
        if (options?.status !== "completed" && options?.status !== "cancelled") {
          // Exclude both completed and cancelled statuses
          // PostgREST syntax: status.not.in.(completed,cancelled)
          query = query.not("status", "in", "(completed,cancelled)")
        }
      }

      if (options?.limit) {
        query = query.limit(options.limit)
        if (options?.page) {
          query = query.range(
            (options.page - 1) * options.limit,
            options.page * options.limit - 1
          )
        }
      }

      const { data: tickets, error } = await query

      if (error) throw error
      if (!tickets || tickets.length === 0) return []
      
      // Enrich tickets with images from auth_user
      return await enrichTicketsWithImages(supabase, tickets)
    },
    staleTime: 30 * 1000, // 30 seconds for list views
  })
}

export function useTicket(ticketId: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()

  // Real-time subscription for specific ticket
  useRealtimeSubscription({
    table: "tickets",
    filter: `id=eq.${ticketId}`,
    enabled: !!ticketId && (options?.enabled !== false),
    onUpdate: async (payload) => {
      const updatedTicketData = payload.new as any
      // Fetch full ticket with relations
      try {
        await ensureUserContext(supabase, userEmail)
        const { data: ticket, error } = await supabase
          .from("tickets")
          .select(`
            *,
            department:departments(id, name),
            project:projects(id, name),
            assignee:users!tickets_assignee_id_fkey(id, name, email),
            sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email),
            requested_by:users!tickets_requested_by_id_fkey(id, name, email),
            epic:epics(id, name, color)
          `)
          .eq("id", ticketId)
          .single()

        if (!error && ticket) {
          // Enrich with images
          const enrichedTickets = await enrichTicketsWithImages(supabase, [ticket])
          const enrichedTicket = enrichedTickets[0]
          
          // Update single ticket cache
          queryClient.setQueryData<{ ticket: Ticket }>(["ticket", ticketId], { ticket: enrichedTicket })
          
          // Update ticket in tickets list cache (all variations)
          const allQueries = queryClient.getQueriesData<Ticket[]>({ queryKey: ["tickets"] })
          for (const [queryKey, oldData] of allQueries) {
            if (!oldData) continue
            const ticketIndex = oldData.findIndex(t => t.id === ticketId)
            if (ticketIndex !== -1) {
              const newTickets = [...oldData]
              newTickets[ticketIndex] = enrichedTicket
              queryClient.setQueryData<Ticket[]>(queryKey, newTickets)
            }
          }
        } else {
          console.error("[Realtime] Error fetching updated single ticket:", error)
          queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
        }
      } catch (error) {
        console.error("[Realtime] Error processing single ticket update:", error)
        queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })
      }
    },
    onDelete: () => {
      // Remove ticket from cache
      queryClient.removeQueries({ queryKey: ["ticket", ticketId] })
      // Update tickets list to remove deleted ticket
      queryClient.setQueriesData<Ticket[]>(
        { queryKey: ["tickets"] },
        (old) => old ? old.filter(t => t.id !== ticketId) : old
      )
    },
  })

  return useQuery<{ ticket: Ticket }>({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      // Set user context for RLS (cached, only called once per session)
      await ensureUserContext(supabase, userEmail)

        const { data: ticket, error } = await supabase
          .from("tickets")
          .select(`
            *,
            department:departments(id, name),
            project:projects(id, name),
            assignee:users!tickets_assignee_id_fkey(id, name, email),
            sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email),
            requested_by:users!tickets_requested_by_id_fkey(id, name, email),
            epic:epics(id, name, color),
            sprint:sprints(id, name, status)
          `)
          .eq("id", ticketId)
          .single()

      if (error) throw error
      if (!ticket) throw new Error("Ticket not found")
      
      // Enrich with images
      const enrichedTickets = await enrichTicketsWithImages(supabase, [ticket])
      return { ticket: enrichedTickets[0] }
    },
    enabled: !!ticketId && (options?.enabled !== false),
    staleTime: 60 * 1000, // 1 minute for detail views
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  
  return useMutation({
    mutationFn: async (data: {
      project_id?: string | null
      title: string
      description?: string
      due_date?: string
      assignee_id?: string
      sqa_assignee_id?: string
      sqa_assigned_at?: string | null
      requested_by_id?: string
      priority?: string
      type?: string
      status?: string
      department_id?: string
      links?: string[]
      epic_id?: string
      sprint_id?: string
    }) => {
      if (!userEmail) throw new Error("Not authenticated")
      
      // Get current user ID (context already set by ensureUserContext)
      await ensureUserContext(supabase, userEmail)
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", userEmail)
        .single()

      if (!user) throw new Error("User not found")

      // Set timestamps based on assignee and status
      const now = new Date().toISOString()
      const finalStatus = data.status || "open"
      
      const assignedAt = data.assignee_id ? now : null
      let startedAt: string | null = null
      let completedAt: string | null = null
      
      // If status is "in_progress", set started_at
      if (finalStatus === "in_progress") {
        startedAt = now
      }
      
      // If status is "cancelled" or "completed", set completed_at and started_at
      if (finalStatus === "cancelled" || finalStatus === "completed") {
        completedAt = now
        startedAt = now // Also set started_at when completing
      }

      // Create ticket with retry logic for duplicate display_id errors
      let ticket: any = null
      let error: any = null
      const maxRetries = 3
      let retryCount = 0

      while (retryCount < maxRetries) {
        const result = await supabase
          .from("tickets")
          .insert({
            ...data,
            assigned_at: assignedAt,
            sqa_assigned_at: data.sqa_assigned_at ?? (data.sqa_assignee_id ? now : null),
            started_at: startedAt,
            completed_at: completedAt,
            requested_by_id: data.requested_by_id || user.id,
            status: finalStatus,
            priority: data.priority || "medium",
            type: data.type || "task",
            links: prepareLinkPayload(data.links),
          })
          .select(`
            *,
            department:departments(id, name),
            project:projects(id, name),
            assignee:users!tickets_assignee_id_fkey(id, name, email),
            sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email),
            requested_by:users!tickets_requested_by_id_fkey(id, name, email),
            epic:epics(id, name, color),
            sprint:sprints(id, name, status)
          `)
          .single()

        error = result.error
        ticket = result.data

        // If no error, we're done
        if (!error) break

        // If it's a duplicate key error for display_id, retry
        if (error?.code === "23505" && error?.message?.includes("display_id")) {
          retryCount++
          if (retryCount < maxRetries) {
            // Wait a bit before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 100 * retryCount))
            continue
          }
        }

        // For other errors or max retries reached, throw
        throw error
      }

      if (error) throw error
      if (!ticket) throw new Error("Failed to create ticket")
      
      // Enrich with images
      const enrichedTickets = await enrichTicketsWithImages(supabase, [ticket])
      return { ticket: enrichedTickets[0] }
    },
    onSuccess: (data, variables) => {
      // Optimistically update cache
      queryClient.setQueriesData<Ticket[]>(
        { queryKey: ["tickets"] },
        (old) => old ? [data.ticket, ...old] : [data.ticket]
      )
      if (variables.project_id) {
        queryClient.invalidateQueries({ queryKey: ["project", variables.project_id] })
      }
    },
  })
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      title?: string
      description?: string
      due_date?: string | null
      status?: string
      priority?: string
      type?: string
      assignee_id?: string | null
      sqa_assignee_id?: string | null
      requested_by_id?: string
      department_id?: string | null
      epic_id?: string | null
      sprint_id?: string | null
      assigned_at?: string | null
      sqa_assigned_at?: string | null
      started_at?: string | null
      completed_at?: string | null
      created_at?: string | null
      links?: string[]
    }) => {
      if (!userEmail) throw new Error("Not authenticated")
      
      await ensureUserContext(supabase, userEmail)

      const { links, ...rest } = data
      const updatePayload: Record<string, any> = { ...rest }
      if (links !== undefined) {
        updatePayload.links = prepareLinkPayload(links)
      }

      const { data: ticket, error } = await supabase
        .from("tickets")
        .update(updatePayload)
        .eq("id", id)
        .select(`
          *,
          department:departments(id, name),
          project:projects(id, name),
          assignee:users!tickets_assignee_id_fkey(id, name, email),
          sqa_assignee:users!tickets_sqa_assignee_id_fkey(id, name, email),
          requested_by:users!tickets_requested_by_id_fkey(id, name, email),
          epic:epics(id, name, color),
          sprint:sprints(id, name, status)
        `)
        .single()

      if (error) throw error
      if (!ticket) throw new Error("Ticket not found")
      
      // Enrich ticket with images
      const enrichedTickets = await enrichTicketsWithImages(supabase, [ticket])
      return { ticket: enrichedTickets[0] }
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["ticket", variables.id] })
      await queryClient.cancelQueries({ queryKey: ["tickets"] })

      // Snapshot the previous values
      const previousTicket = queryClient.getQueryData<{ ticket: Ticket }>(["ticket", variables.id])
      const previousTickets = queryClient.getQueriesData<Ticket[]>({ queryKey: ["tickets"] })

      const usersData = queryClient.getQueryData<Array<{ id: string; name: string | null; email: string; image: string | null }>>(["users"])
      const departmentsData = queryClient.getQueryData<Array<{ id: string; name: string }>>(["departments"])
      const projectId = previousTicket?.ticket?.project?.id || ""
      const epicsData = queryClient.getQueryData<Array<{ id: string; name: string; color: string }>>(["epics", projectId])
      const sprintsData = queryClient.getQueryData<Array<{ id: string; name: string; status: string }>>(["sprints", projectId])
      const cache = { users: usersData, departments: departmentsData, epics: epicsData, sprints: sprintsData }

      if (previousTicket) {
        const updatedTicket = applyTicketUpdateVariables(previousTicket.ticket, variables, cache)
        queryClient.setQueryData<{ ticket: Ticket }>(["ticket", variables.id], { ticket: updatedTicket })
      }

      previousTickets.forEach(([queryKey, data]) => {
        if (data) {
          const updatedTickets = data.map(ticket =>
            ticket.id === variables.id ? applyTicketUpdateVariables(ticket, variables, cache) : ticket
          )
          queryClient.setQueryData<Ticket[]>(queryKey, updatedTickets)
        }
      })

      // Return context with previous values for rollback
      return { previousTicket, previousTickets }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTicket) {
        queryClient.setQueryData(["ticket", variables.id], context.previousTicket)
      }
      if (context?.previousTickets) {
        context.previousTickets.forEach(([queryKey, data]) => {
          if (data) {
            queryClient.setQueryData(queryKey, data)
          }
        })
      }
    },
    onSuccess: (data) => {
      // Update cache with server response
      queryClient.setQueryData<{ ticket: Ticket }>(["ticket", data.ticket.id], { ticket: data.ticket })
      queryClient.setQueriesData<Ticket[]>(
        { queryKey: ["tickets"] },
        (old) => {
          if (!old) return old
          const index = old.findIndex(t => t.id === data.ticket.id)
          if (index !== -1) {
            const newTickets = [...old]
            newTickets[index] = data.ticket
            return newTickets
          }
          return old
        }
      )
      // Only invalidate project queries if ticket belongs to a project (for project stats)
      if (data?.ticket?.project?.id) {
        queryClient.invalidateQueries({ queryKey: ["project", data.ticket.project.id] })
      }
    },
  })
}

export function useDeleteTicket() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  const userEmail = useUserEmail()
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userEmail) throw new Error("Not authenticated")
      
      await ensureUserContext(supabase, userEmail)

      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", id)

      if (error) throw error
      return { id }
    },
    onMutate: async (id) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["ticket", id] })
      await queryClient.cancelQueries({ queryKey: ["tickets"] })

      // Snapshot previous values
      const previousTicket = queryClient.getQueryData<{ ticket: Ticket }>(["ticket", id])
      const previousTickets = queryClient.getQueriesData<Ticket[]>({ queryKey: ["tickets"] })

      // Optimistically remove
      queryClient.removeQueries({ queryKey: ["ticket", id] })
      previousTickets.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData<Ticket[]>(queryKey, data.filter(t => t.id !== id))
        }
      })

      return { previousTicket, previousTickets }
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousTicket) {
        queryClient.setQueryData(["ticket", id], context.previousTicket)
      }
      if (context?.previousTickets) {
        context.previousTickets.forEach(([queryKey, data]) => {
          if (data) queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ["ticket", id] })
      queryClient.setQueriesData<Ticket[]>(
        { queryKey: ["tickets"] },
        (old) => old ? old.filter(t => t.id !== id) : old
      )
    },
  })
}
