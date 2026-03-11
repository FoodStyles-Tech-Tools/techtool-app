# Techtool-App: Senior Staff Architecture Audit

**Date:** March 2025  
**Scope:** Full codebase — frontend (Vite/React), backend (Express), shared lib, types, and tooling.

---

## 1. Architecture Rating: **4/10**

**Verdict:** The codebase is in a **half-migrated, inconsistent state** with real separation between Express and the SPA but with **weak boundaries**, **duplicated concepts**, and **structure that will confuse junior developers**. It runs, but maintainability and onboarding cost are high.

---

## 2. Brutally Honest Critique

### What’s working
- **Backend layering** is clear: `server/routes` → `server/controllers` → `server/services` → `server/repositories`, with validation in `server/validation`. Controllers stay thin and delegate to services.
- **Single entry points**: `index.html` → `src/main.tsx` for client; `backend/server.ts` for API. No ambiguity about how the app starts.
- **Auth and permissions**: Supabase auth plus a dedicated permissions layer; `shared/permissions.ts` for flag derivation is a good shared contract.
- **Documentation**: `docs/architecture-normalization.md` describes a target layout and phase gates; the boundary script enforces some rules.

### What’s broken or risky

1. **Two “frontends” in one repo**  
   You have **`src/`** (Vite routes, `router.tsx`) as the **actual** app and **`app/`** (Next-style `(app)/(dashboard)|(admin)`, `(public)`) as **legacy**. The router does **not** use `app/` for rendering; it uses `src/routes/` and `features/`. The `app/` tree only re-exports from `src/routes/` or wraps with `requirePagePermission`/`redirect`. So you have:
   - Duplicate route concepts (Next-style routes vs React Router routes).
   - Confusing naming: “app” suggests “the application,” but the real app lives in `src/`.
   - Risk of juniors adding features under `app/` and wondering why behavior doesn’t match.

2. **Flat `@/` alias over the whole repo**  
   `tsconfig` and Vite use `"@/*": ["./*"]`. So **every** top-level folder (`lib`, `server`, `backend`, `components`, `features`, `hooks`, `types`, `app`, `src`, `shared`) lives under one namespace. There is **no** compile-time or tooling barrier preventing:
   - A client component from importing `@/server/...` or `@/lib/auth-helpers` (server-only).
   - Backend from pulling in React or Vite-only code by mistake.  
   You rely on a **script** (`check-runtime-boundaries.js`) to forbid `@/app/` in most places; there is **no** equivalent guard for `@/lib/server/` or `@/server/` from client code. A junior dev can easily ship server-only code to the browser.

3. **`lib/` is a mixed bag**  
   In one folder you have:
   - **Client-only:** `lib/auth-client.ts`, `lib/client/api.ts`, `lib/config/client-env.ts`, `lib/supabase-client.ts`, `lib/supabase-browser.ts`
   - **Server-only:** `lib/auth-helpers.ts`, `lib/auth.ts`, `lib/supabase.ts`, `lib/config/server-env.ts`, and everything under `lib/server/`
   - **Unclear / shared:** `lib/links.ts`, `lib/rich-text.ts`, `lib/ticket-statuses.ts`, `lib/utils.ts`  
   Naming doesn’t signal runtime: `lib/supabase.ts` is server, `lib/supabase-client.ts` is browser — easy to misuse. “use client” in `client-env.ts` is a Next.js directive and is a no-op in Vite. So **client vs server is not enforced by structure or naming**.

4. **Router is a god file**  
   `src/router.tsx` (~370 lines) does too much:
   - Route list and lazy route definitions
   - Inline layout components (`FullScreenMessage`, `ProtectedLayout`, `RouteLoadingFallback`)
   - Page wrappers that **fetch data** (`ProjectsPage`, `AssetsPage`, `UsersPage`, `RolesPage`, `TicketDetailRoute`) and pass it as props
   - Inline types (`RoleRecord`)
   - Auth callback redirect logic  
   So routing, layout, data fetching, and types are all coupled in one file. Changing one concern risks breaking others, and onboarding requires reading one large file.

5. **Type duplication and drift**  
   The same concepts are redefined in many places:
   - **Project / User:** `src/routes/projects/projects-client.tsx` (e.g. `ProjectRowData`, `BasicUser`, `Department`), `hooks/use-projects.ts` (`Project`, `ProjectsResponse`, `ProjectCollaborator`), `components/forms/project-form.tsx` — no single source of truth.
   - **Ticket:** `lib/types.ts`, `types/api/tickets.ts`, `features/tickets/types/index.ts`, `features/tickets/hooks/use-ticket-detail.ts`, `lib/server/report.ts` (e.g. `TicketRow`), plus component-level interfaces.  
   When the API or DB shape changes, multiple files must be updated; types will drift and bugs will appear at runtime.

6. **Inconsistent import paths**  
   The router and others mix:
   - `@/src/routes/...` (redundant “src” in path)
   - `@/features/...`
   - `@/components/...`  
   So “where do pages live?” is unclear: sometimes under `src/routes/`, sometimes under `features/`. Mental model for “route vs feature” is not obvious.

7. **Legacy API surface**  
   Tickets have both legacy (`/api/tickets`, list/detail/create/update) and v2 (`/api/v2/tickets`) endpoints. The doc says legacy is for compatibility; having both in the same router and controllers increases cognitive load and the chance of inconsistent behavior.

8. **Backend build and path hacks**  
   `backend/server.ts` infers `runtimeRoot` and `workspaceRoot` from `__dirname` and whether it’s running from `dist-backend`. That’s brittle (e.g. changing deploy layout can break static serving). One clear convention (e.g. env for client dist path) would be simpler.

9. **`shared/` is underused**  
   The architecture doc says “Shared contracts: shared/”, but in practice only `shared/permissions.ts` exists. Types, API contracts, and validation schemas live in `types/`, `lib/`, and `server/validation/` instead of a single shared layer. So “shared” is not the default place for cross-stack contracts.

10. **No ESLint**  
    No ESLint config in the repo. You miss automated enforcement of import boundaries, consistent hooks rules, and basic style — all important for junior-heavy teams.

---

## 3. Key Architectural Problems (Summary)

| Problem | Impact |
|--------|--------|
| Single `@/` over entire repo with no client/server split | Accidental server code in client bundle; no clear “safe” imports for frontend |
| `lib/` mixes client, server, and shared without naming/structure rules | Easy to import server-only code in UI |
| Two route trees (`src/` vs `app/`) with legacy re-exports | Confusion about where to add routes/features |
| God router: routing + layout + data fetching + types | Hard to change, hard to test, hard to onboard |
| Widespread type duplication (Project, Ticket, User, etc.) | Drift, bugs, and extra work on API changes |
| Inconsistent path usage (`@/src/routes` vs `@/features`) | Unclear “home” for pages and features |
| Legacy + v2 ticket APIs in same surface | More code paths and regression risk |
| No shared contract folder (only `shared/permissions.ts`) | Types and DTOs scattered; no single API contract |
| No ESLint / import-boundary rules | No automatic guardrails for juniors |

---

## 4. Suggested Folder Structure

Goal: **frontend and backend fully separated**, **one obvious place** for each kind of code, and **shared** limited to contracts and pure utilities.

```
techtool-app/
├── package.json
├── tsconfig.json              # Base; paths only for shared + client
├── tsconfig.client.json       # Frontend (src/client)
├── tsconfig.server.json       # Backend (src/server) — no client paths
├── vite.config.ts             # Only builds src/client
├── index.html                 # Points at src/client
│
├── src/
│   ├── client/                 # FRONTEND ONLY (Vite bundle)
│   │   ├── main.tsx
│   │   ├── app.tsx
│   │   ├── router.tsx         # Thin: routes + lazy components only
│   │   ├── routes/            # One folder per route area
│   │   │   ├── signin/
│   │   │   ├── projects/
│   │   │   ├── assets/
│   │   │   ├── report/
│   │   │   ├── admin/
│   │   │   ├── clockify/
│   │   │   └── tickets/       # Or keep under features; pick one
│   │   ├── components/        # UI primitives + layout
│   │   ├── features/          # Feature-specific UI + hooks (tickets, clockify, report)
│   │   ├── hooks/             # Data / auth / app hooks
│   │   └── lib/               # Client-only helpers (api, auth-client, config, utils)
│   │
│   ├── server/                 # BACKEND ONLY (Node/Express)
│   │   ├── index.ts           # Express app entry (current backend/server.ts)
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── validation/
│   │   └── http/              # Middleware, request context, errors
│   │
│   └── shared/                 # CROSS-STACK (types, API contracts, pure helpers)
│       ├── types/             # Auth, API DTOs, ticket/project/user shapes
│       ├── permissions.ts     # buildPermissionFlags etc.
│       ├── validation/        # Zod schemas used by both client and server (if any)
│       └── constants.ts       # Pure constants (no env, no I/O)
│
├── scripts/                   # Build, DB, CI scripts
├── supabase/                  # Migrations
├── docs/
└── .github/
```

**Removed or relocated:**
- **`app/`** — Delete after migrating any remaining behavior into `src/client/routes` and removing re-exports. No second route tree.
- **Root-level `components/`, `features/`, `hooks/`, `lib/`** — Move into `src/client/` (or `src/client/features/`, etc.) so the frontend has one root.
- **Root-level `backend/` and `server/`** — Move into `src/server/` with a single entry (`index.ts`).
- **Root-level `lib/`** — Split: client-only → `src/client/lib/`, server-only → `src/server/lib/` (or inline into server), shared → `src/shared/`.
- **Root-level `types/`** — Move into `src/shared/types/` and become the single source of truth for API and domain types.

**Path aliases (example):**
- **Client tsconfig / Vite:** `@/` → `src/client/` (so client code cannot see `server/` or `shared/` implementation details unless you explicitly allow it). Optionally `@shared/` → `src/shared/` for types and contracts.
- **Server tsconfig:** `@/` or `@server/` → `src/server/`, `@shared/` → `src/shared/`. Server must not import from `src/client/`.

This gives:
- **Frontend** = everything under `src/client/` (and shared types).
- **Backend** = everything under `src/server/` (and shared types).
- **Shared** = `src/shared/` only; no runtime mixing of client and server in one folder.

---

## 5. Concrete Refactoring Recommendations

### 5.1 Immediate (low risk, high clarity)

1. **Standardize route imports**  
   Use either `@/routes/...` or `@/features/...` for page-level components, not `@/src/routes/...`. Prefer one convention (e.g. route screens in `src/client/routes/`, feature logic in `src/client/features/`) and stick to it.

2. **Split the router**  
   - **`router.tsx`**: Only route list and lazy component imports; no layout components, no data fetching.
   - **Layouts:** Move `ProtectedLayout`, `FullScreenMessage`, `RouteLoadingFallback` to e.g. `src/client/components/layout/` or `src/client/routes/_layout/`.
   - **Data-loading wrappers:** Move `ProjectsPage`, `AssetsPage`, `UsersPage`, `RolesPage`, `TicketDetailRoute` into their own files under the corresponding route folder (e.g. `routes/projects/projects-page.tsx`) and have the router only reference these wrappers. Each wrapper owns one route’s data and renders the actual client component.

3. **Single source of truth for API/DTO types**  
   - Choose one place (e.g. `types/api/` or future `src/shared/types/`) for: Project, User, Ticket (list/detail), Role, Asset, etc.
   - Export from there and have hooks, components, and server validation import from that module. Remove or re-export duplicate definitions in `lib/types.ts`, `hooks/use-projects.ts`, and component files.

4. **Name server-only code clearly**  
   - Rename or document: e.g. `lib/auth-helpers.ts` → `lib/server/auth-helpers.ts` (or move to `server/auth/`) and ensure only server and shared code import it. Add a comment at the top: “Server-only. Do not import from client code.”

5. **Add ESLint**  
   - Use `eslint-plugin-import` and/or `eslint-plugin-boundaries` (or similar) to:
     - Disallow imports from `server/` (and `lib/server/`) in `src/` (and later `src/client/`).
     - Optionally restrict `app/` to legacy paths until removed.
   - Run in CI so juniors get fast feedback.

### 5.2 Short term (structural)

6. **Adopt the suggested folder structure in phases**  
   - Phase 1: Introduce `src/client/` and `src/server/` and move current `src/` into `src/client/`, current `server/` + `backend/` into `src/server/`. Adjust Vite and `tsconfig.server.json` so build and dev still work. Keep `@/` pointing at the new client root for the frontend.
   - Phase 2: Move `components/`, `features/`, `hooks/` into `src/client/`. Move shared types into `src/shared/types/` and switch imports to `@shared/` or a dedicated alias.
   - Phase 3: Remove `app/` once no code references it; delete legacy re-exports and Next-style wrappers.

7. **Enforce client/server boundaries in TypeScript**  
   - Separate `tsconfig.client.json` (includes only `src/client/` + `src/shared/`) and `tsconfig.server.json` (includes only `src/server/` + `src/shared/`). Ensure server does not reference client. That gives compile-time protection against pulling React or client-only code into the server.

8. **Deprecate legacy ticket API in code and docs**  
   - Mark legacy ticket endpoints and controllers as `@deprecated` and add a timeline (e.g. “Remove in Q3”). Migrate any remaining callers to v2, then remove legacy routes and controller branches.

### 5.3 Longer term (maintainability and scale)

9. **API contract layer**  
   - Define request/response types and (where useful) Zod schemas in `src/shared/`. Server validation and client fetchers both use these. Reduces drift and duplicate parsing logic.

10. **Simplify static serving**  
    - Avoid `__dirname`-based detection where possible. Prefer a single env var (e.g. `CLIENT_DIST_PATH`) for where the built SPA lives, and document it for local and production.

11. **Document “where to put what”**  
    - One short doc (or section in README): “Adding a new page,” “Adding a new API,” “Adding a new type,” with exact folder and file names. Makes the intended architecture the default for juniors.

---

## 6. Risks: Performance, Scalability, Technical Debt

| Risk | Notes |
|------|--------|
| **Bundle size** | Single `@/` and mixed `lib/` increase the chance of pulling server or heavy code into the client. Moving to `src/client/` and strict aliases reduces that. |
| **Build complexity** | Backend build with `tsc-alias` and path resolution is already non-trivial. A single `src/server/` tree and clear tsconfig reduce surprises. |
| **Scaling the team** | Without clear boundaries and one place for types, more developers will duplicate logic and types and add features in the wrong place (e.g. under `app/`). The suggested structure and docs mitigate that. |
| **Technical debt** | The `app/` tree and legacy ticket API are the largest debt. Removing `app/` and deprecating legacy APIs on a timeline prevents debt from growing. |
| **Testing** | A thinner router and separated layout/data-loading components make route and integration tests easier. Shared types and validation enable contract tests. |

---

## 7. Summary

- **Rating: 4/10** — Backend is structured well; frontend and shared layers are inconsistent and risky for juniors.
- **Largest issues:** Single global `@/` with no client/server split, mixed `lib/`, two route trees, god router, and duplicated types.
- **Target:** One frontend root (`src/client/`), one backend root (`src/server/`), one shared contract root (`src/shared/`), with path aliases and (optionally) tsconfigs that enforce boundaries.
- **Quick wins:** Split router, centralize API/types, name server-only code, add ESLint and (if possible) import-boundary rules.
- **Next step:** Implement “Standardize route imports” and “Split the router,” then “Single source of truth for API/DTO types,” then phase the folder restructure and remove `app/` and legacy ticket APIs.

---

## 8. Implemented (Post-Audit)

- **Router split:** Layouts and page wrappers moved out of `src/router.tsx`. New files:
  - `src/layouts/` — `FullScreenMessage`, `RouteLoadingFallback`, `ProtectedLayout`, `AuthCallbackPage`, `SettingsRedirectPage`, `NotFoundPage`
  - `src/routes/projects/projects-page.tsx`, `project-detail-route.tsx`
  - `src/routes/assets/assets-page.tsx`
  - `src/routes/admin/users/users-page.tsx`, `src/routes/admin/roles/roles-page.tsx`
  - `features/tickets/components/tickets-page.tsx`, `ticket-detail-route.tsx`
  - `src/router.tsx` is now ~100 lines (routes + lazy definitions only).
- **Path alias:** `@/routes/*` → `src/routes/*` (Vite and tsconfig); router and route code use `@/routes/...` instead of `@/src/routes/...`.
- **ESLint:** `eslint.config.cjs` with TypeScript, React, React Hooks, and **no-restricted-imports** for client code: blocks `**/server/**`, `**/backend/**`, `**/lib/server/**`, and server-only lib modules. `npm run lint` runs with `--config eslint.config.cjs`.
