# TechTool

Ticket and project management app running on a split dev stack:

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Auth and data: Supabase

## Development

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example` and fill in the real values.

Start both servers:

```bash
npm run dev
```

Dev URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Environment

Standard variables:

```env
# Frontend
VITE_APP_URL=http://localhost:5173
VITE_BACKEND_URL=http://localhost:4000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend
PORT=4000
APP_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Compatibility fallbacks still work for older env names such as `NEXT_PUBLIC_*`, `VITE_PUBLIC_*`, `VITE_API_URL`, and `VITE_SERVER_URL`, but they are now deprecated.

## Auth setup

Configure Supabase Auth redirect URLs:

- `http://localhost:4000/auth/callback`
- `https://your-backend-domain.com/auth/callback`

Configure Google OAuth redirect URLs to the same backend callback URL.

After the backend completes the OAuth exchange, it redirects users back to the frontend app URL (`APP_URL` / `VITE_APP_URL`).

## Scripts

```bash
npm run dev
npm run build
npm test
npm start
```

Notes:

- `npm run dev` starts Vite and Express together.
- The backend watcher includes `server/**/*.ts` and `lib/**/*.ts`.
- Set `DEBUG_ROUTES=true` to print the full Express route manifest on startup.

## Architecture

The codebase is split into **client**, **server**, and **shared**:

- **`src/`** – Frontend only (Vite + React). Entry: `src/main.tsx` → `src/app.tsx` → `src/router.tsx`. Route screens live in `src/routes/`, feature UI and hooks in `src/features/`, shared UI in `src/components/`, app-level hooks in `src/hooks/`. Use `@client/` for imports under `src/`.
- **`server/`** – Backend only (Express). Entry: `server/server.ts`. Handlers live in `server/routes/`, `server/controllers/`, `server/services/`, `server/repositories/`, `server/validation/`. Use `@server/` for server imports.
- **`shared/`** – Cross-stack contracts: `shared/types/` (API/domain types), `shared/permissions.ts`, `shared/constants.ts`. Use `@shared/` for types and shared logic. Client and server must not import each other; use `shared/` and the API boundary instead.

Path aliases: `@client/*` → `src/*`, `@server/*` → `server/*`, `@shared/*` → `shared/*`, `@lib/*` → `lib/*`. ESLint enforces that code under `src/` cannot import from `server/` or `lib/server/`, and server code cannot import from `src/`.

**Where to add things**

- New page/screen: `src/routes/<area>/` and/or a component in `src/features/<feature>/`.
- New API: `server/routes/`, `server/controllers/`, `server/services/`, `server/repositories/`, plus validation in `server/validation/`.
- New shared type or DTO: `shared/types/`.

## Build and production

```bash
npm run build
npm start
```

Production serves the built Vite frontend and the Express API from the same backend process.
