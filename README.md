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
- The backend watcher includes `backend/**/*.ts` and `lib/**/*.ts`.
- Set `DEBUG_ROUTES=true` to print the full Express route manifest on startup.

## Architecture

- `src/` contains the Vite client entry and React Router setup.
- `backend/routes/api/**/route.ts` and `backend/routes/auth/**/route.ts` contain backend route handlers mounted by Express.
- `backend/server.ts` loads those route handlers dynamically and serves the built frontend in production.

## Build and production

```bash
npm run build
npm start
```

Production serves the built Vite frontend and the Express API from the same backend process.
