"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"

interface DepartmentFormProps {
  onSuccess?: () => void
}

export function DepartmentForm({ onSuccess }: DepartmentFormProps) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast("Name is required", "error")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (res.ok) {
        toast("Department added")
        setName("")
        onSuccess?.()
      } else {
        const error = await res.json().catch(() => null)
        toast(error?.error || "Failed to add department", "error")
      }
    } catch (error) {
      console.error("Error creating department:", error)
      toast("Failed to add department", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm">Department Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Engineering"
          disabled={loading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving..." : "Add Department"}
      </Button>
    </form>
  )
}

