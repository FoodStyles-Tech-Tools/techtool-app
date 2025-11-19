"use client"

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
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
})

type RoleFormValues = z.infer<typeof roleSchema>

interface RoleFormProps {
  onSuccess?: () => void
  initialData?: Partial<RoleFormValues> & { id?: string }
}

export function RoleForm({ onSuccess, initialData }: RoleFormProps) {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
    },
  })

  const onSubmit = async (values: RoleFormValues) => {
    try {
      const url = initialData?.id
        ? `/api/roles/${initialData.id}`
        : "/api/roles"
      const method = initialData?.id ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (res.ok) {
        form.reset()
        onSuccess?.()
      } else {
        const error = await res.json()
        alert(error.error || "Failed to save role")
      }
    } catch (error) {
      console.error("Error saving role:", error)
      alert("Failed to save role")
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
              <FormLabel>Role Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., manager, viewer"
                  {...field}
                  disabled={
                    !!initialData?.id &&
                    ((initialData as any).is_system ||
                      (initialData as any).name?.toLowerCase() === "admin")
                  }
                />
              </FormControl>
              <FormDescription>
                A unique name for this role (lowercase, no spaces)
              </FormDescription>
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
                  placeholder="Describe what this role can do"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={
            !!initialData?.id &&
            ((initialData as any).is_system ||
              (initialData as any).name?.toLowerCase() === "admin")
          }
        >
          {initialData?.id ? "Update Role" : "Create Role"}
        </Button>
      </form>
    </Form>
  )
}

