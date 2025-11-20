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
import { useCreateEpic, useUpdateEpic } from "@/hooks/use-epics"

const epicSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color"),
})

type EpicFormValues = z.infer<typeof epicSchema>

interface EpicFormProps {
  projectId: string
  onSuccess?: () => void
  initialData?: Partial<EpicFormValues> & { id?: string }
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
]

export function EpicForm({ projectId, onSuccess, initialData }: EpicFormProps) {
  const createEpic = useCreateEpic()
  const updateEpic = useUpdateEpic()
  const isEditing = Boolean(initialData?.id)

  const form = useForm<EpicFormValues>({
    resolver: zodResolver(epicSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      color: initialData?.color || "#3b82f6",
    },
  })

  const onSubmit = async (values: EpicFormValues) => {
    try {
      if (initialData?.id) {
        await updateEpic.mutateAsync({ id: initialData.id, ...values })
      } else {
        await createEpic.mutateAsync({
          ...values,
          project_id: projectId,
        })
      }

      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error("Error saving epic:", error)
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
              <FormLabel>Epic Name</FormLabel>
              <FormControl>
                <Input placeholder="Epic name" {...field} />
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
                  placeholder="Epic description"
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
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className={`w-8 h-8 rounded-md border-2 transition-all ${
                          field.value === color
                            ? "border-foreground scale-110"
                            : "border-muted hover:border-foreground/50"
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                  <Input
                    type="text"
                    placeholder="#3b82f6"
                    {...field}
                    className="font-mono"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={createEpic.isPending || updateEpic.isPending}
        >
          {isEditing ? "Update Epic" : "Create Epic"}
        </Button>
      </form>
    </Form>
  )
}

