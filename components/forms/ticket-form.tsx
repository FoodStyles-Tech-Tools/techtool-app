"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm, useFieldArray, FieldArrayPath } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Bug, CheckSquare, ChevronDown, ChevronUp, ChevronsUp, Minus, Sparkles, X } from "lucide-react"
import { DepartmentForm } from "@/components/forms/department-form"
import { useDepartments } from "@/hooks/use-departments"
import { UserSelectItem, UserSelectValue } from "@/components/user-select-item"
import { TicketTypeSelect } from "@/components/ticket-type-select"
import { TicketPrioritySelect } from "@/components/ticket-priority-select"
import { useCreateTicket, useUpdateTicket } from "@/hooks/use-tickets"
import { toast } from "@/components/ui/toast"
import { useEpics } from "@/hooks/use-epics"
import { EpicSelect } from "@/components/epic-select"
import { usePermissions } from "@/hooks/use-permissions"
import { useSprints } from "@/hooks/use-sprints"
import { SprintSelect } from "@/components/sprint-select"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { ASSIGNEE_ALLOWED_ROLES } from "@/lib/ticket-constants"

const NO_PROJECT_VALUE = "__no_project__"

const ticketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  type: z.enum(["bug", "request", "task"]).default("task"),
  project_id: z
    .union([
      z.string().uuid(),
      z.literal(NO_PROJECT_VALUE),
      z.literal(""),
      z.null(),
    ])
    .optional(),
  assignee_id: z.string().optional(),
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
  initialData?: Partial<TicketFormValues> & { id?: string }
  formId?: string
  hideSubmitButton?: boolean
}

interface User {
  id: string
  name: string | null
  email: string
  image?: string | null
  role?: string | null
}

const CREATE_TYPE_OPTIONS = [
  {
    value: "bug",
    label: "Bug",
    description: "Report a problem",
    icon: Bug,
    iconClassName: "text-rose-500",
  },
  {
    value: "request",
    label: "Feature",
    description: "Ask for a feature",
    icon: Sparkles,
    iconClassName: "text-blue-500",
  },
  {
    value: "task",
    label: "Task",
    description: "Track a deliverable",
    icon: CheckSquare,
    iconClassName: "text-emerald-500",
  },
] as const

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", icon: ChevronDown, iconClassName: "text-blue-500" },
  { value: "medium", label: "Medium", icon: Minus, iconClassName: "text-amber-500" },
  { value: "high", label: "High", icon: ChevronUp, iconClassName: "text-orange-500" },
  { value: "urgent", label: "Urgent", icon: ChevronsUp, iconClassName: "text-rose-500" },
] as const

export function TicketForm({
  projectId,
  projectOptions = [],
  onSuccess,
  initialData,
  formId,
  hideSubmitButton = false,
}: TicketFormProps) {
  const [users, setUsers] = useState<User[]>([])
  const [includeInactiveProjects, setIncludeInactiveProjects] = useState(false)
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
      department_id: initialData?.department_id || "",
      epic_id: initialData?.epic_id || "",
      sprint_id: initialData?.sprint_id || "",
      links: initialData?.links || [],
    },
  })
  const selectedProjectId = form.watch("project_id")
  const effectiveProjectId =
    projectId || (selectedProjectId && selectedProjectId !== NO_PROJECT_VALUE ? selectedProjectId : "")
  const filteredProjectOptions = useMemo(() => {
    const visibleProjects = includeInactiveProjects
      ? projectOptions
      : projectOptions.filter(
      (project) =>
        project.status?.toLowerCase() !== "inactive" || project.id === selectedProjectId
    )
    return [...visibleProjects].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
    )
  }, [projectOptions, includeInactiveProjects, selectedProjectId])
  const { epics } = useEpics(effectiveProjectId)
  const { sprints } = useSprints(effectiveProjectId)

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

  const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray<TicketFormValues, FieldArrayPath<TicketFormValues>>({
    control: form.control,
    name: "links" as FieldArrayPath<TicketFormValues>,
  })

  const onSubmit = async (values: TicketFormValues) => {
    try {
      if (!canSubmit) {
        toast("You do not have permission to perform this action.", "error")
        return
      }
      const sanitizedLinks = (values.links || []).map((link) => link.trim()).filter(Boolean)
      const payload = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        type: values.type,
        project_id:
          projectId || (values.project_id && values.project_id !== NO_PROJECT_VALUE ? values.project_id : null),
        assignee_id: values.assignee_id || undefined,
        department_id: values.department_id || undefined,
        epic_id: values.epic_id || undefined,
        sprint_id: values.sprint_id || undefined,
        links: sanitizedLinks,
      }

      if (initialData?.id) {
        await updateTicket.mutateAsync({ id: initialData.id, ...payload })
        toast("Ticket updated successfully")
      } else {
        await createTicket.mutateAsync(payload)
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
          disabled={isReadOnly}
          className={isReadOnly ? "space-y-4 opacity-70" : "space-y-4"}
        >
        {!isEditing && (
          <div className="space-y-5 rounded-xl bg-muted/10 p-4 ring-1 ring-border/35">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Type
                  </FormLabel>
                  <FormControl>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {CREATE_TYPE_OPTIONS.map((option) => {
                        const Icon = option.icon
                        const isActive = field.value === option.value

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              "rounded-xl border p-4 text-left transition-all",
                              isActive
                                ? "border-primary/50 bg-primary/10 shadow-sm"
                                : "border-border/45 bg-background/50 hover:border-border/70 hover:bg-muted/35"
                            )}
                          >
                            <Icon className={cn("mb-3 h-4 w-4", option.iconClassName)} />
                            <p className="text-sm font-semibold">{option.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                          </button>
                        )
                      })}
                    </div>
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
                  <FormLabel className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Priority
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-4 gap-1 rounded-xl bg-background/45 p-1 ring-1 ring-border/40">
                      {PRIORITY_OPTIONS.map((option) => {
                        const Icon = option.icon
                        const isActive = field.value === option.value

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-3.5 w-3.5",
                                isActive ? "text-primary-foreground" : option.iconClassName
                              )}
                            />
                            <span>{option.label}</span>
                          </button>
                        )
                      })}
                    </div>
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
                    <FormLabel className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Project
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || NO_PROJECT_VALUE}>
                      <FormControl>
                        <SelectTrigger className="h-10 border-border/40 bg-background/55">
                          <SelectValue placeholder="No Project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_PROJECT_VALUE}>No Project</SelectItem>
                        {filteredProjectOptions.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <span className="text-xs text-muted-foreground">Include Inactive</span>
                      <Switch
                        checked={includeInactiveProjects}
                        onCheckedChange={setIncludeInactiveProjects}
                        aria-label="Include inactive projects"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Ticket title" className="border-border/40 bg-background/55" {...field} />
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
                <Textarea
                  className="border-border/40 bg-background/55"
                  placeholder="Ticket description"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isEditing && (
          <>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <TicketTypeSelect
                      value={field.value}
                      onValueChange={field.onChange}
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
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <TicketPrioritySelect
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        <FormField
          control={form.control}
          name="assignee_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignee (Optional)</FormLabel>
              <Select
                onValueChange={(value) => {
                  // Convert "unassigned" to empty string, which will become null
                  field.onChange(value === "unassigned" ? "" : value)
                }}
                value={field.value || "unassigned"}
              >
                <FormControl>
                  <SelectTrigger className="relative border-border/40 bg-background/55">
                    {field.value && field.value !== "unassigned" ? (
                      <UserSelectValue
                        users={users.filter((user) => (user.role ? ASSIGNEE_ALLOWED_ROLES.has(user.role.toLowerCase()) : false))}
                        value={field.value || null}
                        placeholder="Select an assignee"
                        unassignedValue="unassigned"
                        unassignedLabel="Unassigned"
                      />
                    ) : (
                      <SelectValue placeholder="Select an assignee" />
                    )}
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users
                    .filter((user) => (user.role ? ASSIGNEE_ALLOWED_ROLES.has(user.role.toLowerCase()) : false))
                    .map((user) => (
                      <UserSelectItem key={user.id} user={user} value={user.id} />
                    ))}
                </SelectContent>
              </Select>
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
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger className="border-border/40 bg-background/55">
                      <SelectValue placeholder="Select a department (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.value && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-10 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent z-10"
                    onClick={(e) => {
                      e.stopPropagation()
                      field.onChange("")
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
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
            disabled={createTicket.isPending || updateTicket.isPending || !canSubmit}
          >
            {isEditing ? "Update Ticket" : "Create Ticket"}
          </Button>
        )}
        {isReadOnly && (
          <p className="text-xs text-muted-foreground text-center">
            You do not have permission to {isEditing ? "update" : "create"} tickets.
          </p>
        )}
        </fieldset>
      </form>
    </Form>
  )
}
