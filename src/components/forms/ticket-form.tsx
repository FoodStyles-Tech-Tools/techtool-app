"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm, useFieldArray, FieldArrayPath } from "react-hook-form"
import { lazyComponent } from "@client/lib/lazy-component"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@client/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@client/components/ui/form"
import { Input } from "@client/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@client/components/ui/dialog"
import { DepartmentForm } from "@client/components/forms/department-form"
import { useDepartments } from "@client/hooks/use-departments"
import { TicketTypeCards } from "@client/components/forms/ticket-type-cards"
import { TicketPriorityPills } from "@client/components/forms/ticket-priority-pills"
import { useCreateTicket, useUpdateTicket } from "@client/features/tickets/hooks/use-tickets"
import { toast } from "@client/components/ui/toast"
import { useEpics } from "@client/hooks/use-epics"
import { EpicSelect } from "@client/components/epic-select"
import { usePermissions } from "@client/hooks/use-permissions"
import { useSprints } from "@client/hooks/use-sprints"
import { SprintSelect } from "@client/components/sprint-select"
import { ASSIGNEE_ALLOWED_ROLES } from "@shared/ticket-constants"
import { inputClassNameLg } from "@client/lib/form-styles"
import { normalizeRichTextInput } from "@shared/rich-text"
import type { User } from "@shared/types"

const NO_PROJECT_VALUE = "__no_project__"
const RichTextEditor = lazyComponent(
  () => import("@client/components/rich-text-editor").then((mod) => mod.RichTextEditor),
)
const nativeSelectClassName = inputClassNameLg

const ticketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  type: z.enum(["bug", "request", "task", "subtask"]).default("task"),
  project_id: z
    .union([
      z.string().uuid(),
      z.literal(NO_PROJECT_VALUE),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  assignee_id: z.string().optional(),
  requested_by_id: z.string().optional(),
  department_id: z
    .union([
      z.string().uuid(),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  epic_id: z
    .union([
      z.string().uuid(),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  sprint_id: z
    .union([
      z.string().uuid(),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  links: z.array(z.string().url("Enter a valid URL")).default([]),
})

type TicketFormValues = z.infer<typeof ticketSchema>

interface TicketFormProps {
  projectId?: string
  projectOptions?: Array<{ id: string; name: string; status?: string }>
  onSuccess?: () => void
  onCreated?: (ticket: { id: string; displayId: string | null; title: string }) => void | Promise<void>
  onSubmittingChange?: (isSubmitting: boolean) => void
  createOverrides?: { created_at?: string | null }
  initialData?: Partial<TicketFormValues> & { id?: string }
  formId?: string
  hideSubmitButton?: boolean
}

export function TicketForm({
  projectId,
  projectOptions = [],
  onSuccess,
  onCreated,
  onSubmittingChange,
  createOverrides,
  initialData,
  formId,
  hideSubmitButton = false,
}: TicketFormProps) {
  const [users, setUsers] = useState<User[]>([])
  const { departments, refresh } = useDepartments()
  const { user, flags } = usePermissions()
  const [isDepartmentDialogOpen, setDepartmentDialogOpen] = useState(false)
  const createTicket = useCreateTicket()
  const updateTicket = useUpdateTicket()
  const isEditing = Boolean(initialData?.id)
  const canCreateTickets = flags?.canCreateTickets ?? false
  const canEditTickets = flags?.canEditTickets ?? false
  const canSubmit = isEditing ? canEditTickets : canCreateTickets

  useEffect(() => {
    // Fetch users for assignee dropdown
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          setUsers(data.users)
        }
      })
      .catch((error) => {
        console.error("Error fetching users:", error)
      })
  }, [])

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      priority: initialData?.priority || "medium",
      type: initialData?.type || "task",
      project_id: initialData?.project_id || projectId || NO_PROJECT_VALUE,
      assignee_id: initialData?.assignee_id || (isEditing ? "" : (user?.id || "")),
      requested_by_id: initialData?.requested_by_id || (isEditing ? "" : (user?.id || "")),
      department_id: initialData?.department_id || "",
      epic_id: initialData?.epic_id || "",
      sprint_id: initialData?.sprint_id || "",
      links: initialData?.links || [],
    },
  })
  const isSubmitting = form.formState.isSubmitting || createTicket.isPending || updateTicket.isPending
  const selectedProjectId = form.watch("project_id")
  const effectiveProjectId =
    projectId || (selectedProjectId && selectedProjectId !== NO_PROJECT_VALUE ? selectedProjectId : "")
  const filteredProjectOptions = useMemo(() => {
    const visibleProjects = projectOptions.filter(
      (project) =>
        project.status?.toLowerCase() !== "inactive" || project.id === selectedProjectId
    )
    return [...visibleProjects].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
    )
  }, [projectOptions, selectedProjectId])
  const assigneeUsers = useMemo(
    () =>
      users
        .filter((u) => (u.role ? ASSIGNEE_ALLOWED_ROLES.has(u.role.toLowerCase()) : false))
        .slice()
        .sort((a, b) => {
          const aLabel = (a.name || a.email || "").toLowerCase()
          const bLabel = (b.name || b.email || "").toLowerCase()
          return aLabel.localeCompare(bLabel)
        }),
    [users]
  )
  const sortedReporterUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const aLabel = (a.name || a.email || "").toLowerCase()
        const bLabel = (b.name || b.email || "").toLowerCase()
        return aLabel.localeCompare(bLabel)
      }),
    [users]
  )
  const { epics } = useEpics()
  const { sprints } = useSprints()

  useEffect(() => {
    if (projectId) return
    form.setValue("epic_id", "")
    form.setValue("sprint_id", "")
  }, [selectedProjectId, projectId, form])

  // Set default assignee to current user when creating a new ticket
  useEffect(() => {
    if (!isEditing && user?.id && !form.getValues("assignee_id")) {
      form.setValue("assignee_id", user.id)
    }
  }, [user?.id, isEditing, form])

  // Set default reporter to current user when creating a new ticket
  useEffect(() => {
    if (!isEditing && user?.id && !form.getValues("requested_by_id")) {
      form.setValue("requested_by_id", user.id)
    }
  }, [user?.id, isEditing, form])

  const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray<TicketFormValues, FieldArrayPath<TicketFormValues>>({
    control: form.control,
    name: "links" as FieldArrayPath<TicketFormValues>,
  })

  useEffect(() => {
    onSubmittingChange?.(isSubmitting)
  }, [isSubmitting, onSubmittingChange])

  useEffect(() => {
    return () => {
      onSubmittingChange?.(false)
    }
  }, [onSubmittingChange])

  const onSubmit = async (values: TicketFormValues) => {
    try {
      if (!canSubmit) {
        toast("You do not have permission to perform this action.", "error")
        return
      }
      const sanitizedLinks = (values.links || []).map((link) => link.trim()).filter(Boolean)
      const payload = {
        title: values.title,
        description: normalizeRichTextInput(values.description),
        priority: values.priority,
        type: values.type,
        projectId:
          projectId || (values.project_id && values.project_id !== NO_PROJECT_VALUE ? values.project_id : null),
        assigneeId: values.assignee_id || undefined,
        requestedById: values.requested_by_id || undefined,
        departmentId: values.department_id || undefined,
        epicId: values.epic_id || undefined,
        sprintId: values.sprint_id || undefined,
        links: sanitizedLinks,
      }

      if (initialData?.id) {
        await updateTicket.mutateAsync({ id: initialData.id, ...payload })
        toast("Ticket updated successfully")
      } else {
        const created = await createTicket.mutateAsync({
          ...payload,
          createdAt: createOverrides?.created_at || undefined,
        })
        if (created?.ticket?.id && created?.ticket?.title) {
          await onCreated?.({
            id: created.ticket.id,
            displayId: created.ticket.displayId || null,
            title: created.ticket.title,
          })
        }
        toast("Ticket created successfully")
      }

      form.reset()
      onSuccess?.()
    } catch (error: any) {
      console.error("Error saving ticket:", error)
      
      // Extract error message
      let errorMessage = "Failed to save ticket"
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.error?.message) {
        errorMessage = error.error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }
      
      toast(errorMessage, "error")
    }
  }

  const isReadOnly = !canSubmit

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <fieldset
          disabled={isReadOnly || isSubmitting}
          className={isReadOnly || isSubmitting ? "space-y-4 opacity-70" : "space-y-4"}
        >
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</FormLabel>
              <FormControl>
                <TicketTypeCards
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isReadOnly || isSubmitting}
                  excludeSubtask
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Priority</FormLabel>
              <FormControl>
                <TicketPriorityPills
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isReadOnly || isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!projectId && projectOptions.length > 0 && (
          <FormField
            control={form.control}
            name="project_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <FormControl>
                  <select
                    value={field.value || NO_PROJECT_VALUE}
                    onChange={(event) => field.onChange(event.target.value)}
                    className={nativeSelectClassName}
                  >
                    <option value={NO_PROJECT_VALUE}>No Project</option>
                    {filteredProjectOptions.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Ticket title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <RichTextEditor
                  className="border-border"
                  placeholder="Ticket description"
                  value={field.value || ""}
                  onChange={field.onChange}
                  activateOnClick
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assignee_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignee (Optional)</FormLabel>
              <FormControl>
                <select
                  value={field.value || "unassigned"}
                  onChange={(event) => field.onChange(event.target.value === "unassigned" ? "" : event.target.value)}
                  className={nativeSelectClassName}
                >
                  <option value="unassigned">Unassigned</option>
                  {assigneeUsers.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.name || assignee.email}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="requested_by_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reporter</FormLabel>
              <FormControl>
                <select
                  value={field.value || ""}
                  onChange={(event) => field.onChange(event.target.value)}
                  className={nativeSelectClassName}
                >
                  <option value="">Select reporter</option>
                  {sortedReporterUsers.map((reporter) => (
                    <option key={reporter.id} value={reporter.id}>
                      {reporter.name || reporter.email}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="department_id"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Department</FormLabel>
                <Dialog open={isDepartmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="ghost" size="sm">
                      Manage
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Department</DialogTitle>
                  </DialogHeader>
                  <DepartmentForm
                    onSuccess={() => {
                      setDepartmentDialogOpen(false)
                      refresh()
                    }}
                  />
                </DialogContent>
              </Dialog>
              </div>
              <div className="relative">
                <FormControl>
                  <select
                    value={field.value || ""}
                    onChange={(event) => field.onChange(event.target.value)}
                    className={nativeSelectClassName}
                  >
                    <option value="">Select a department (optional)</option>
                    {[...departments]
                      .sort((a, b) =>
                        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
                      )
                      .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </FormControl>
                {field.value && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-10 top-1/2 z-10 h-6 -translate-y-1/2 px-1.5 text-xs hover:bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation()
                      field.onChange("")
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {effectiveProjectId && epics.length > 0 && (
          <FormField
            control={form.control}
            name="epic_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Epic</FormLabel>
                <FormControl>
                  <EpicSelect
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value || "")}
                    epics={epics}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {effectiveProjectId && sprints.length > 0 && (
          <FormField
            control={form.control}
            name="sprint_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sprint</FormLabel>
                <FormControl>
                  <SprintSelect
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value || "")}
                    sprints={sprints}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="links"
          render={() => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Links</FormLabel>
                <Button type="button" variant="ghost" size="sm" onClick={() => appendLink("")}>
                  Add URL
                </Button>
              </div>
              <div className="space-y-3">
                {linkFields.length === 0 && (
                  <p className="text-sm text-muted-foreground">No links added yet.</p>
                )}
                {linkFields.map((linkField, index) => (
                  <FormField
                    key={linkField.id}
                    control={form.control}
                    name={`links.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input placeholder="https://example.com" {...field} />
                            <Button type="button" variant="outline" size="sm" onClick={() => removeLink(index)}>
                              Remove
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </FormItem>
          )}
        />
        {!hideSubmitButton && (
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !canSubmit}
          >
            {isEditing ? (isSubmitting ? "Updating..." : "Update Ticket") : (isSubmitting ? "Creating..." : "Create Ticket")}
          </Button>
        )}
        {isReadOnly && (
          <p className="text-center text-xs text-muted-foreground">
            You do not have permission to {isEditing ? "update" : "create"} tickets.
          </p>
        )}
        </fieldset>
      </form>
    </Form>
  )
}


