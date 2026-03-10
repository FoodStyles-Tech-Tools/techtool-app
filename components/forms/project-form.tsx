"use client"

import { useState } from "react"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DepartmentForm } from "@/components/forms/department-form"
import { useCreateProject, useUpdateProject } from "@/hooks/use-projects"
import { CollaboratorSelector } from "@/components/collaborator-selector"

const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  require_sqa: z.boolean().default(false),
  department_id: z
    .union([
      z.string().uuid(),
      z.literal(""),
      z.literal("no_department"),
    ])
    .optional(),
  collaborator_ids: z.array(z.string().uuid()).default([]),
  requester_ids: z.array(z.string().uuid()).default([]),
  links: z.array(z.string().url("Enter a valid URL")).default([]),
})

type ProjectFormValues = z.infer<typeof projectSchema>

interface ProjectFormProps {
  onSuccess?: () => void
  initialData?: Partial<ProjectFormValues> & { id?: string }
  departments: Array<{ id: string; name: string }>
  users: Array<{ id: string; name: string | null; email: string; image: string | null; role?: string | null }>
  formId?: string
  hideSubmitButton?: boolean
}

const NO_DEPARTMENT_VALUE = "no_department"
const nativeSelectClassName =
  "h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/20"

export function ProjectForm({
  onSuccess,
  initialData,
  departments,
  users,
  formId,
  hideSubmitButton = false,
}: ProjectFormProps) {
  const [isDepartmentDialogOpen, setDepartmentDialogOpen] = useState(false)
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const isEditing = Boolean(initialData?.id)

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      status: initialData?.status || "active",
      require_sqa: initialData?.require_sqa ?? false,
      department_id: initialData?.department_id || NO_DEPARTMENT_VALUE,
      collaborator_ids: initialData?.collaborator_ids || [],
      requester_ids: initialData?.requester_ids || [],
      links: initialData?.links || [],
    },
  })

  const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray<ProjectFormValues, FieldArrayPath<ProjectFormValues>>({
    control: form.control,
    name: "links" as FieldArrayPath<ProjectFormValues>,
  })

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      const sanitizedLinks = (values.links || []).map((link) => link.trim()).filter(Boolean)
      const payload = {
        name: values.name,
        description: values.description,
        status: values.status,
        require_sqa: values.require_sqa,
        department_id:
          values.department_id && values.department_id !== NO_DEPARTMENT_VALUE ? values.department_id : undefined,
        collaborator_ids: values.collaborator_ids || [],
        requester_ids: values.requester_ids || [],
        links: sanitizedLinks,
      }

      if (initialData?.id) {
        await updateProject.mutateAsync({ id: initialData.id, ...payload })
      } else {
        await createProject.mutateAsync(payload)
      }

      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error("Error saving project:", error)
      alert("Failed to save project")
    }
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input placeholder="Project name" {...field} />
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
                    placeholder="Project description"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <select
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  className={nativeSelectClassName}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="require_sqa"
          render={({ field }) => (
            <FormItem>
              <FieldGroup className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                <Field orientation="horizontal" className="justify-between gap-3">
                  <div className="space-y-0.5">
                    <FieldLabel htmlFor="project-require-sqa">Require SQA</FieldLabel>
                    <p className="text-xs text-muted-foreground">
                      Set this as true if project requires SQA review before deployment.
                    </p>
                  </div>
                  <FormControl>
                    <input
                      id="project-require-sqa"
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="h-4 w-4 rounded border-border text-foreground"
                    />
                  </FormControl>
                </Field>
              </FieldGroup>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="collaborator_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Collaborators</FormLabel>
              <CollaboratorSelector
                users={users || []}
                value={field.value || []}
                onChange={field.onChange}
                placeholder="Add collaborators"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="requester_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Requesters</FormLabel>
              <CollaboratorSelector
                users={users || []}
                value={field.value || []}
                onChange={field.onChange}
                placeholder="Add requesters"
              />
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
                    }}
                  />
                </DialogContent>
              </Dialog>
              </div>
              <FormControl>
                <select
                  value={field.value ?? NO_DEPARTMENT_VALUE}
                  onChange={(event) => field.onChange(event.target.value)}
                  className={nativeSelectClassName}
                >
                  <option value={NO_DEPARTMENT_VALUE}>No Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
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
            disabled={createProject.isPending || updateProject.isPending}
          >
            {isEditing ? "Update Project" : "Create Project"}
          </Button>
        )}
      </form>
    </Form>
  )
}
