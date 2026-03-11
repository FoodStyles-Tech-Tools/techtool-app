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
- The backend watcher includes `server/**/*.ts` and `shared/**/*.ts`.
- Set `DEBUG_ROUTES=true` to print the full Express route manifest on startup.

## Architecture

The codebase is split into three top-level zones:

```
src/          → Frontend (Vite + React SPA)
server/       → Backend (Express API)
shared/       → Contracts and pure helpers (used by both)
```

- **`src/`** – Frontend only. Entry: `src/main.tsx` → `src/app.tsx` → `src/router.tsx`. Route screens in `src/routes/`, feature modules in `src/features/`, shared UI in `src/components/`, app hooks in `src/hooks/`, client infra in `src/lib/`. Import via `@client/`.
- **`server/`** – Backend only. Entry: `server/server.ts`. Layers: `routes/` → `controllers/` → `services/` → `repositories/`. Server infra and helpers in `server/lib/`. Import via `@server/`.
- **`shared/`** – Pure types, constants, and mappers. Domain types in `shared/types/domain.ts`, API DTOs in `shared/types/api/`, mappers in `shared/types/*-mappers.ts`. Import via `@shared/`.

Path aliases: `@client/*` → `src/*`, `@server/*` → `server/*`, `@shared/*` → `shared/*`. ESLint enforces that `src/` cannot import from `server/` and vice versa. Both may import from `shared/`. `shared/` must not import from `src/` or `server/`.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a detailed contribution guide.

## Build and production

```bash
npm run build
npm start
```

Production serves the built Vite frontend and the Express API from the same backend process.
