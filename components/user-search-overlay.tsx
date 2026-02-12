"use client"

import { useState, useEffect, useRef, useCallback, useDeferredValue, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useUsers } from "@/hooks/use-users"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const MAX_SEARCH_RESULTS = 50

interface UserSearchOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectUser?: (userId: string) => void
}

export function UserSearchOverlay({ open, onOpenChange, onSelectUser }: UserSearchOverlayProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: usersData, isLoading } = useUsers({
    enabled: open,
    realtime: false,
  })
  const deferredQuery = useDeferredValue(searchQuery)

  const users = useMemo(() => usersData || [], [usersData])

  // Filter users based on search query with a deferred value to keep typing responsive
  const filteredUsers = useMemo(() => {
    if (!users.length) return []
    const trimmedQuery = deferredQuery.trim().toLowerCase()
    if (!trimmedQuery) {
      return users.slice(0, MAX_SEARCH_RESULTS)
    }
    return users
      .filter(
        (user) =>
          user.name?.toLowerCase().includes(trimmedQuery) ||
          user.email.toLowerCase().includes(trimmedQuery) ||
          user.role?.toLowerCase().includes(trimmedQuery)
      )
      .slice(0, MAX_SEARCH_RESULTS)
  }, [users, deferredQuery])

  const handleSelectUser = useCallback((userId: string) => {
    if (onSelectUser) {
      onSelectUser(userId)
    }
    onOpenChange(false)
  }, [onOpenChange, onSelectUser])

  // Focus input when overlay opens, restore focus when it closes
  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure overlay is fully rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      setSearchQuery("")
      setSelectedIndex(0)
    } else if (!open) {
      // Restore focus to document body when overlay closes to ensure keyboard events work
      // Use setTimeout to ensure this happens after the close animation
      setTimeout(() => {
        // Blur any active element first
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        // Focus body to ensure keyboard events are captured
        document.body.focus()
      }, 150)
    }
  }, [open])

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => {
          if (filteredUsers.length === 0) return 0
          return Math.min(prev + 1, filteredUsers.length - 1)
        })
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (filteredUsers.length === 0 ? 0 : Math.max(prev - 1, 0)))
      } else if (e.key === "Enter" && filteredUsers[selectedIndex]) {
        e.preventDefault()
        e.stopPropagation()
        handleSelectUser(filteredUsers[selectedIndex].id)
      } else if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onOpenChange(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown, true) // Use capture phase
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [open, filteredUsers, selectedIndex, onOpenChange, handleSelectUser])

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  const getRoleColor = (role: string | null | undefined) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "member":
        return "default"
      default:
        return "secondary"
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-in-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => onOpenChange(false)}
      />
      
      {/* Overlay */}
      <div 
        className={cn(
          "fixed left-1/2 top-1/2 z-[100] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ease-in-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="mx-4 rounded-lg border bg-background shadow-lg">
          {/* Search Input */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search users by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? "No users found" : "Start typing to search users"}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user, index) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors",
                      index === selectedIndex
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.image || ""}
                        alt={user.name || ""}
                      />
                      <AvatarFallback className="text-xs">
                        {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">
                          {user.name || "No name"}
                        </span>
                        <Badge 
                          variant={getRoleColor(user.role) as any} 
                          className="text-xs"
                        >
                          {user.role || "member"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
