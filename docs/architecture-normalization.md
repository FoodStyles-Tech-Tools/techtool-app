# Architecture Normalization

## Target Runtime Shape
- Client: `Vite + React Router`
- Server: `Express`
- Data/Auth: `Supabase`
- Shared contracts: `shared/`

## Target Layout
- `src/app`
  - client bootstrap
  - providers
  - app shell wiring
- `src/routes`
  - React Router route ownership
  - transitional wrappers are allowed during migration, but only here
- `src/features`
  - domain UI and hooks
- `server/routes`
  - explicit Express route registration
- `server/controllers`
  - HTTP concerns only
- `server/services`
  - business rules and workflows
- `server/repositories`
  - database access
- `shared`
  - cross-stack contracts and helpers

## Phase Gates
- New runtime code must not import from `@/app/` outside `src/routes/`.
- New runtime code must not import from `@/src/compat/`.
- New backend code must not introduce `NextRequest` or `NextResponse` signatures.
- Deprecated ticket endpoints remain compatibility shims only until internal callers are migrated.

## Current Transition State
- `src/router.tsx` now resolves route modules through `src/routes/` instead of importing `app/` directly.
- Shared permission flag derivation lives in `shared/permissions.ts`.
- Client-side `link`, `router`, and `dynamic` compat usage has been removed from the active Vite runtime paths.
- Canonical ticket endpoints under `/api/v2/tickets` are now owned by explicit Express routes in `server/routes`, `server/controllers`, `server/services`, and `server/repositories`.
- Internal ticket mutations now use `/api/v2/tickets` instead of the deprecated `/api/tickets` mutation endpoints.
- Ticket support endpoints for `by-display-id`, `subtask-counts`, `activity`, and `comments` are also now explicitly registered in Express, even though they still preserve the legacy `/api/tickets/...` URLs.
- `src/routes/signin/signin-content.tsx` is now a real route module; the old `app/(public)/signin/signin-content.tsx` is only a compatibility re-export.
- `backend/server.ts` still contains the legacy Next-style route adapter. That is an acknowledged temporary state until the Express route conversion lands.

## Enforcement
- `npm run check:boundaries` fails if active runtime code imports `@/app/` outside `src/routes/`.
- `npm run check:boundaries` fails if active runtime code imports `@/src/compat/` outside the small legacy allowlist.
- CI runs the boundary check, tests, and build on every push and pull request.
