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
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  discord_id: z.string().optional(),
  role: z.string().min(1, "Role is required"),
})

interface Role {
  id: string
  name: string
}

type UserFormValues = z.infer<typeof userSchema>

interface UserFormProps {
  onSuccess?: () => void
  initialData?: Partial<UserFormValues> & { id?: string }
  roles: Role[]
}

const nativeSelectClassName =
  "h-10 w-full rounded-md border border-border/60 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/20"

export function UserForm({ onSuccess, initialData, roles }: UserFormProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: initialData?.email || "",
      name: initialData?.name || "",
      discord_id: initialData?.discord_id || "",
      role: initialData?.role || "member",
    },
  })

  const onSubmit = async (values: UserFormValues) => {
    try {
      const url = initialData?.id
        ? `/api/users/${initialData.id}`
        : "/api/users"
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
        alert(error.error || "Failed to save user")
      }
    } catch (error) {
      console.error("Error saving user:", error)
      alert("Failed to save user")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="user@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="User name" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="discord_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discord ID (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="123456789012345678" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <select
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  className={nativeSelectClassName}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {initialData?.id ? "Update User" : "Add User"}
        </Button>
      </form>
    </Form>
  )
}
