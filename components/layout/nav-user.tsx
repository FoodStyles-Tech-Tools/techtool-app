"use client"

import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type NavUserProps = {
  user: {
    name: string
    email: string
    avatar: string
  }
  onOpenPreferences: () => void
  onSignOut: () => void
}

export function NavUser({
  user,
  onOpenPreferences,
  onSignOut,
}: NavUserProps) {
  const fallback = user.name?.charAt(0).toUpperCase() || "U"

  return (
    <details className="relative">
      <summary className="flex w-full list-none items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium leading-5 tracking-[-0.005em] transition-colors hover:bg-accent [&::-webkit-details-marker]:hidden">
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 flex-1 text-left text-sm leading-tight tracking-[-0.005em]">
          <span className="truncate font-medium">{user.name}</span>
          <span className="truncate text-xs tracking-[0.01em] text-muted-foreground">{user.email}</span>
        </div>
        <ChevronsUpDown className="ml-auto h-4 w-4" />
      </summary>
      <div className="absolute bottom-full left-0 z-30 mb-2 min-w-56 rounded-lg border border-border/60 bg-background p-1 shadow-md">
        <div className="flex items-center gap-2 px-2 py-2 text-left text-sm font-medium leading-5 tracking-[-0.005em]">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight tracking-[-0.005em]">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs tracking-[0.01em] text-muted-foreground">{user.email}</span>
          </div>
        </div>
        <div className="my-1 h-px bg-border/60" />
        <button
          type="button"
          onClick={onOpenPreferences}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/40"
        >
          <BadgeCheck className="h-4 w-4" />
          Preference
        </button>
        <div className="my-1 h-px bg-border/60" />
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/40"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </details>
  )
}
