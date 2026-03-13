# Architecture & Contribution Guide

## Quick reference

| I want to… | Do this |
|------------|--------|
| Add a new page/screen | Create a route component in `src/routes/<area>/`, add the route in `src/router.tsx`. Put feature logic in `src/features/<feature>/`. |
| Add a new API endpoint | Add route in `server/routes/`, handler in `server/controllers/`, logic in `server/services/`, data access in `server/repositories/`, Zod schemas in `server/validation/`. |
| Add a domain or API type | Domain types → `shared/types/domain.ts`. API DTOs → `shared/types/api/<entity>.ts`. Mappers → `shared/types/<entity>-mappers.ts`. |
| Add a shared utility | Pure (no I/O/DOM/React) → `shared/`. Client-only → `src/lib/`. Server-only → `server/lib/`. |
| Import from another layer | `src/` may only use `@client/*` and `@shared/*`. `server/` may only use `@server/*` and `@shared/*`. `shared/` may only use `@shared/*`. |

## Directory Layout

```
src/                     Frontend (React SPA, Vite)
├── app.tsx              App root (providers, router mount)
├── router.tsx           Route map (keep thin — no logic)
├── main.tsx             Vite entry point
├── routes/              Page-level route components
├── features/            Feature modules (components + hooks + lib)
├── components/          Shared UI components
├── hooks/               App-wide hooks (data fetching, permissions)
├── layouts/             Shell layouts (protected, auth callback)
└── lib/                 Client infra (auth, supabase, utils, env)

server/                  Backend (Express)
├── server.ts            Express entry point
├── routes/              Express routers
├── controllers/         Request handlers (parse + respond)
├── services/            Business logic
├── repositories/        Database access (Supabase queries)
├── validation/          Zod schemas for request validation
├── http/                Express middleware (cookies, headers)
└── lib/                 Server infra (auth, supabase, cache, env)

shared/                  Contracts (used by both client and server)
├── types/
│   ├── domain.ts        Normalized domain types (Ticket, Project, User…)
│   ├── api/             API DTO shapes (wire format)
│   ├── auth.ts          Permission and session types
│   ├── ticket-mappers.ts  DTO → domain mappers for tickets
│   ├── asset-mappers.ts   DTO → domain mappers for assets
│   ├── project-mappers.ts DTO → domain mappers for projects
│   └── index.ts         Barrel re-export
├── auth-session.ts      Supabase user → AppSession mapper
├── links.ts             Link array sanitization
├── rich-text.ts         Rich text ↔ plain text helpers
├── ticket-constants.ts  Shared ticket field metadata
├── ticket-statuses.ts   Status definitions and transitions
├── report-date-range.ts ISO week date range helpers
├── permissions.ts       Permission flag builder
└── constants.ts         Misc shared constants
```

## Path Aliases

| Alias | Resolves to | Use from |
|-------|-------------|----------|
| `@client/*` | `src/*` | `src/` files only |
| `@server/*` | `server/*` | `server/` files only |
| `@shared/*` | `shared/*` | Anywhere |

The legacy `@/*` alias (repo root) still works but should not be used in new code.

## Import Rules

1. `src/` can import `@client/*` and `@shared/*`. Never `@server/*`.
2. `server/` can import `@server/*` and `@shared/*`. Never `@client/*`.
3. `shared/` can import `@shared/*` only. Never `@client/*` or `@server/*`.

ESLint enforces these boundaries. The `scripts/check-runtime-boundaries.js` script provides a second check in CI.

## Adding Things

### New page or screen

1. Create a route component in `src/routes/<area>/`.
2. Add the route to `src/router.tsx`.
3. If the page needs feature-specific logic, create `src/features/<feature>/`.

### New feature module

Create a folder under `src/features/<feature>/` with:
- `components/` — feature UI
- `hooks/` — feature hooks (data fetching, mutations)
- `lib/` — feature utilities, API client functions
- `types/` — feature-specific types (component props, UI state)

Domain types go in `shared/types/`, not in feature folders.

### New API endpoint

1. `server/routes/<entity>-router.ts` — mount the route.
2. `server/controllers/<entity>-controller.ts` — parse request, call service, send response.
3. `server/services/<entity>-service.ts` — business logic, validation.
4. `server/repositories/<entity>-repository.ts` — Supabase queries.
5. `server/validation/<entity>.ts` — Zod request schemas.

### New shared type

- Domain type (Ticket, Project, etc.): add to `shared/types/domain.ts`.
- API DTO: add to `shared/types/api/<entity>.ts`.
- Mapper (DTO → domain): add to `shared/types/<entity>-mappers.ts`.

### New shared utility

If it's pure (no I/O, no env, no DOM), it belongs in `shared/`. If it touches `window`, `import.meta.env`, or React, it belongs in `src/lib/`. If it touches `process.env`, Supabase, or Express, it belongs in `server/lib/`.

## Performance

- **Expensive derivations or callbacks passed to memoized children:** use `useMemo` / `useCallback` so references stay stable and children don’t re-render unnecessarily.
- **List rows:** Table/list row components (e.g. tickets table) are wrapped in `React.memo` where it matters; keep row props stable (e.g. pass callbacks with `useCallback`) to avoid unnecessary re-renders.
- **Data fetching:** React Query with `staleTime` and server-side caching is used for list and detail endpoints; avoid duplicate or redundant requests by reusing query keys and cache updates.
