"use client"

import { useMemo } from "react"
import { useForm } from "react-hook-form"
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
import { Select } from "@client/components/ui/select"
import { Textarea } from "@client/components/ui/textarea"
import { useCreateSprint, useUpdateSprint } from "@client/hooks/use-sprints"
import { useProjects } from "@client/hooks/use-projects"

const sprintSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
})

type SprintFormValues = z.infer<typeof sprintSchema>

interface SprintFormProps {
  onSuccess?: () => void
  initialData?: Partial<SprintFormValues> & { id?: string }
  projectId?: string | null
}

export function SprintForm({ onSuccess, initialData, projectId }: SprintFormProps) {
  const createSprint = useCreateSprint()
  const updateSprint = useUpdateSprint()
  const isEditing = Boolean(initialData?.id)
  const fixedProjectId = projectId || null
  const { data: projectsData } = useProjects({ status: "active" })
  const projectOptions = useMemo(
    () =>
      [...(projectsData || [])].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
      ),
    [projectsData]
  )

  const form = useForm<SprintFormValues>({
    resolver: zodResolver(sprintSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      start_date: initialData?.start_date || null,
      end_date: initialData?.end_date || null,
      projectId: initialData?.projectId || fixedProjectId || null,
    },
  })

  const onSubmit = async (values: SprintFormValues) => {
    try {
      const selectedProjectId = fixedProjectId || values.projectId || null
      const basePayload = {
        name: values.name,
        description: values.description,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
      }
      if (initialData?.id) {
        await updateSprint.mutateAsync({ id: initialData.id, ...basePayload })
      } else {
        await createSprint.mutateAsync({
          ...basePayload,
          projectId: selectedProjectId,
        })
      }

      form.reset()
      onSuccess?.()
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message)
          : ""
      if (
        !isEditing &&
        !fixedProjectId &&
        !values.projectId &&
        message.toLowerCase().includes("project")
      ) {
        form.setError("projectId", {
          type: "manual",
          message: "Project is required in this workspace.",
        })
      }
      console.error("Error saving sprint:", error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sprint Name</FormLabel>
              <FormControl>
                <Input placeholder="Sprint name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!fixedProjectId ? (
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || ""}
                    onChange={(event) => field.onChange(event.target.value || null)}
                  >
                    <option value="">No project</option>
                    {projectOptions.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Sprint description"
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
          name="start_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value || ""}
                  onChange={(e) => {
                    field.onChange(e.target.value || null)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="end_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value || ""}
                  onChange={(e) => {
                    field.onChange(e.target.value || null)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={createSprint.isPending || updateSprint.isPending}
        >
          {isEditing ? "Update Sprint" : "Create Sprint"}
        </Button>
      </form>
    </Form>
  )
}
