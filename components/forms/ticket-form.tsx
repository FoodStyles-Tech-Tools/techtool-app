"use client"

import { useEffect, useState } from "react"
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
import { X } from "lucide-react"
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

const ticketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  type: z.enum(["bug", "request", "task"]).default("task"),
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
  links: z.array(z.string().url("Enter a valid URL")).default([]),
})

type TicketFormValues = z.infer<typeof ticketSchema>

interface TicketFormProps {
  projectId?: string
  onSuccess?: () => void
  initialData?: Partial<TicketFormValues> & { id?: string }
}

interface User {
  id: string
  name: string | null
  email: string
  image?: string | null
  role?: string | null
}

const ASSIGNEE_ALLOWED_ROLES = new Set(["admin", "member"])

export function TicketForm({ projectId, onSuccess, initialData }: TicketFormProps) {
  const [users, setUsers] = useState<User[]>([])
  const { departments, refresh } = useDepartments()
  const { epics } = useEpics(projectId || "")
  const { user } = usePermissions()
  const [isDepartmentDialogOpen, setDepartmentDialogOpen] = useState(false)
  const createTicket = useCreateTicket()
  const updateTicket = useUpdateTicket()
  const isEditing = Boolean(initialData?.id)

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
      assignee_id: initialData?.assignee_id || (isEditing ? "" : (user?.id || "")),
      department_id: initialData?.department_id || "",
      epic_id: initialData?.epic_id || "",
      links: initialData?.links || [],
    },
  })

  // Set default assignee to current user when creating a new ticket
  useEffect(() => {
    if (!isEditing && user?.id && !form.getValues("assignee_id")) {
      form.setValue("assignee_id", user.id)
    }
  }, [user?.id, isEditing])

  const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray<TicketFormValues, FieldArrayPath<TicketFormValues>>({
    control: form.control,
    name: "links" as FieldArrayPath<TicketFormValues>,
  })

  const onSubmit = async (values: TicketFormValues) => {
    try {
      const sanitizedLinks = (values.links || []).map((link) => link.trim()).filter(Boolean)
      const payload = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        type: values.type,
        project_id: projectId || null,
        assignee_id: values.assignee_id || undefined,
        department_id: values.department_id || undefined,
        epic_id: values.epic_id || undefined,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <Textarea
                  placeholder="Ticket description"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  <SelectTrigger className="relative">
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
                    <SelectTrigger>
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
        {projectId && epics.length > 0 && (
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
        <Button
          type="submit"
          className="w-full"
          disabled={createTicket.isPending || updateTicket.isPending}
        >
          {isEditing ? "Update Ticket" : "Create Ticket"}
        </Button>
      </form>
    </Form>
  )
}
