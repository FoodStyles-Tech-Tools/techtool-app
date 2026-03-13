"use client"

type NavUserProps = {
  user: {
    name: string
    email: string
    avatar: string
  }
  onSignOut: () => void
  avatarOnly?: boolean
}

export function NavUser({ user, onSignOut, avatarOnly = false }: NavUserProps) {
  const fallback = user.name?.charAt(0).toUpperCase() || "U"

  return (
    <details className="relative">
      <summary className="flex list-none cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="h-8 w-8 rounded-md border border-border object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground">
            {fallback}
          </div>
        )}
        {!avatarOnly ? (
          <>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
            <span className="ml-auto text-xs font-medium uppercase tracking-wide text-muted-foreground">Menu</span>
          </>
        ) : null}
      </summary>
      <div className="absolute right-0 top-full z-30 mt-2 min-w-44 rounded-lg border border-border bg-card p-1 shadow-lg">
        {!avatarOnly ? (
          <>
            <div className="flex items-center gap-2 px-2 py-2 text-left text-sm font-medium">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-8 w-8 rounded-md border border-border object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground">
                  {fallback}
                </div>
              )}
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </div>
            <div className="my-1 h-px bg-border" />
          </>
        ) : (
          <div className="px-2 py-2 text-xs text-muted-foreground">{user.email}</div>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Log out
        </button>
      </div>
    </details>
  )
}
