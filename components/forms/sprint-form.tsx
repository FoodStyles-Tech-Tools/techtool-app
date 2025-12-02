"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
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
import { useCreateSprint, useUpdateSprint } from "@/hooks/use-sprints"

const sprintSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["planned", "active", "completed", "cancelled"]).default("planned"),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
})

type SprintFormValues = z.infer<typeof sprintSchema>

interface SprintFormProps {
  projectId: string
  onSuccess?: () => void
  initialData?: Partial<SprintFormValues> & { id?: string }
}

export function SprintForm({ projectId, onSuccess, initialData }: SprintFormProps) {
  const createSprint = useCreateSprint()
  const updateSprint = useUpdateSprint()
  const isEditing = Boolean(initialData?.id)

  const form = useForm<SprintFormValues>({
    resolver: zodResolver(sprintSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      status: initialData?.status || "planned",
      start_date: initialData?.start_date || null,
      end_date: initialData?.end_date || null,
    },
  })

  const onSubmit = async (values: SprintFormValues) => {
    try {
      const payload = {
        name: values.name,
        description: values.description,
        status: values.status,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
      }
      if (initialData?.id) {
        await updateSprint.mutateAsync({ id: initialData.id, ...payload })
      } else {
        await createSprint.mutateAsync({
          ...payload,
          project_id: projectId,
        })
      }

      form.reset()
      onSuccess?.()
    } catch (error) {
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
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
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

