"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@client/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@client/components/ui/form"
import { Input } from "@client/components/ui/input"
import { Textarea } from "@client/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useCreateTicket } from "@client/features/tickets/hooks/use-tickets"
import { toast } from "@client/components/ui/toast"
import { TicketPrioritySelect } from "@client/components/ticket-priority-select"
import { useUsers } from "@client/hooks/use-users"
import { ASSIGNEE_ALLOWED_ROLES } from "@shared/ticket-constants"
import { inputClassNameLg } from "@client/lib/form-styles"

const createSubtaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignee_id: z.string().optional(),
  requested_by_id: z.string().min(1, "Reporter is required"),
})

type CreateSubtaskFormValues = z.infer<typeof createSubtaskSchema>

export interface CreateSubtaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentTicketId: string
  parentDisplayId: string | null
  parentTitle: string
  projectId?: string | null
  departmentId?: string | null
  /** Parent ticket reporter id; subtask reporter defaults to this */
  parentRequestedById?: string | null
  onSuccess?: () => void
}

const UNASSIGNED_VALUE = "unassigned"

export function CreateSubtaskDialog({
  open,
  onOpenChange,
  parentTicketId,
  parentDisplayId,
  parentTitle,
  departmentId,
  parentRequestedById,
  onSuccess,
}: CreateSubtaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createTicket = useCreateTicket()
  const { data: usersData } = useUsers({ realtime: false })
  const users = useMemo(() => usersData || [], [usersData])
  const assigneeUsers = useMemo(
    () =>
      users
        .filter((u) =>
          u.role ? ASSIGNEE_ALLOWED_ROLES.has(u.role.toLowerCase()) : false
        )
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

  const defaultRequestedById = parentRequestedById || ""

  const form = useForm<CreateSubtaskFormValues>({
    resolver: zodResolver(createSubtaskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      assignee_id: "",
      requested_by_id: defaultRequestedById,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        description: "",
        priority: "medium",
        assignee_id: "",
        requested_by_id: defaultRequestedById,
      })
    }
    // form is stable from useForm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultRequestedById])

  const resetAndClose = () => {
    form.reset({
      title: "",
      description: "",
      priority: "medium",
      assignee_id: "",
      requested_by_id: defaultRequestedById,
    })
    onOpenChange(false)
  }

  const onSubmit = async (values: CreateSubtaskFormValues) => {
    setIsSubmitting(true)
    try {
      await createTicket.mutateAsync({
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        type: "subtask",
        status: "open",
        priority: values.priority,
        parentTicketId,
        projectId: projectId || undefined,
        departmentId: departmentId || undefined,
        assigneeId:
          values.assignee_id && values.assignee_id !== UNASSIGNED_VALUE
            ? values.assignee_id
            : undefined,
        requestedById: values.requested_by_id.trim() || undefined,
      })
      toast("Subtask created")
      resetAndClose()
      onSuccess?.()
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Failed to create subtask"
      toast(message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const parentLabel = [
    parentDisplayId ? (parentDisplayId || "").toUpperCase() : null,
    parentTitle,
  ]
    .filter(Boolean)
    .join(" – ")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Create Subtask</DialogTitle>
          {parentLabel ? (
            <p className="text-sm font-normal text-muted-foreground" id="create-subtask-parent">
              {parentLabel}
            </p>
          ) : null}
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-4 space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Subtask title"
                      className={inputClassNameLg}
                      {...field}
                    />
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
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add details..."
                      className="min-h-[80px] resize-y"
                      {...field}
                      value={field.value ?? ""}
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
                      className="w-full"
                      triggerClassName="h-10 w-full"
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
                  <FormLabel>Assignee (optional)</FormLabel>
                  <FormControl>
                    <select
                      value={field.value || UNASSIGNED_VALUE}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === UNASSIGNED_VALUE
                            ? ""
                            : e.target.value
                        )
                      }
                      className={inputClassNameLg}
                    >
                      <option value={UNASSIGNED_VALUE}>Unassigned</option>
                      {assigneeUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email}
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
                      onChange={(e) => field.onChange(e.target.value)}
                      className={inputClassNameLg}
                    >
                      <option value="">Select reporter</option>
                      {sortedReporterUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => resetAndClose()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create Subtask"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
