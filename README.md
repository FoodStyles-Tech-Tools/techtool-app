# TechTool - Ticket Management System

A modern, Notion-style ticket management web application for IT teams, built with Next.js, TypeScript, Supabase, and BetterAuth.

## Features

- **Google OAuth Authentication** - Secure sign-in with Google accounts
- **Project Management** - Create and manage projects with status tracking
- **Ticket System** - Create, assign, and track tickets across projects
- **User Roles** - Admin and member roles with appropriate permissions
- **Modern UI** - Clean, Notion-inspired interface built with shadcn/ui
- **Desktop-First Design** - Optimized for desktop browsers (1024px+)

## Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **UI**: Tailwind CSS + shadcn/ui components
- **Authentication**: BetterAuth with Google OAuth
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ and npm/pnpm
- A Supabase account and project
- A Google Cloud project with OAuth credentials

## Setup Instructions

### 1. Clone and Install

```bash
# Install dependencies
npm install
# or
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# BetterAuth
BETTER_AUTH_SECRET=your_better_auth_secret_key_here
BETTER_AUTH_URL=http://localhost:3000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Postgres Connection (for BetterAuth)
POSTGRES_CONNECTION_STRING=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to your project dashboard
3. Navigate to **Project Settings** (gear icon in the left sidebar)
4. Click on **Database** in the settings menu
5. Scroll down to the **Connection string** section
6. You'll see different connection string formats. For BetterAuth, you need the **Connection pooling** or **Direct connection** string
7. Select the **URI** format (it will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
8. Replace `[YOUR-PASSWORD]` with your actual database password (found in the same Database settings page under "Database password")
9. Copy the full connection string and update `POSTGRES_CONNECTION_STRING` in `.env.local`

**Note**: The connection string format should be:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Important**: 
- Use the **Connection pooling** string for better performance (port 6543) or **Direct connection** (port 5432)
- The password is your database password, NOT the `SUPABASE_ANON_KEY`
- **If your password contains special characters**, you may need to URL-encode them:
  - `@` becomes `%40`
  - `#` becomes `%23`
  - `$` becomes `%24`
  - `%` becomes `%25`
  - `&` becomes `%26`
  - `/` becomes `%2F`
  - `?` becomes `%3F`
  - `=` becomes `%3D`
- Keep this connection string secure and never commit it to version control

**Troubleshooting Connection Issues:**
- Make sure the connection string starts with `postgresql://` or `postgres://`
- Verify the hostname is correct (should be `db.[PROJECT-REF].supabase.co`)
- Check that your database password is correctly URL-encoded if it contains special characters
- Try using the **Direct connection** (port 5432) instead of Connection pooling if you're having DNS issues
- Ensure your network can reach Supabase (check firewall settings)

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Set Application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)
7. Copy the Client ID and Client Secret to `.env.local`

### 5. Database Migrations

Run the migration files in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run `supabase/migrations/001_initial_schema.sql` to create the base schema
4. Run `supabase/migrations/002_better_auth_schema.sql` to set up BetterAuth tables
   - **Note**: BetterAuth may auto-create some tables. If you get errors about existing tables, you can skip those CREATE TABLE statements.

### 6. Seed Database (Optional)

For development, you can seed the database with sample data:

1. In Supabase SQL Editor, run `supabase/seed.sql`
2. This creates sample users, projects, and tickets

### 7. BetterAuth Secret

Generate a secure random string for `BETTER_AUTH_SECRET`:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 8. Run Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Tables

- **users** - User accounts with roles (admin/member)
- **projects** - Project management with status tracking
- **tickets** - Tickets with status, priority, and assignment
- **BetterAuth tables** - Session and authentication data (auto-created by BetterAuth)

### Enums

- `user_role`: `admin`, `member`
- `project_status`: `open`, `in_progress`, `closed`
- `ticket_status`: `todo`, `in_progress`, `blocked`, `done`
- `ticket_priority`: `low`, `medium`, `high`, `urgent`

## API Routes

### Authentication
- `GET/POST /api/auth/[...all]` - BetterAuth handler
- `GET /api/auth/me` - Get current user session

### Projects
- `GET /api/projects` - List projects (with pagination and filters)
- `POST /api/projects` - Create project (admin only)
- `GET /api/projects/[id]` - Get project details
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project (admin only, blocks if tickets exist)

### Tickets
- `GET /api/tickets` - List tickets (with filters)
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/[id]` - Get ticket details
- `PATCH /api/tickets/[id]` - Update ticket

### Users
- `GET /api/users` - List users (for assignee dropdowns)

## Authorization

- **Admin**: Full access to all features, can create/delete projects
- **Member**: Can create/edit tickets, cannot delete projects
- Project owners have project-level admin rights

All authorization checks are enforced server-side in API routes.

## Deployment

### Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to update:
- `NEXT_PUBLIC_APP_URL` to your production domain
- `BETTER_AUTH_URL` to your production domain
- Google OAuth redirect URIs to include your production domain

## Project Structure

```
techtool-app-v2/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── projects/          # Project pages
│   ├── tickets/           # Ticket pages
│   ├── settings/          # Settings page
│   └── signin/            # Sign-in page
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── forms/            # Form components
│   └── ui/               # shadcn/ui components
├── lib/                   # Utility functions
│   ├── auth.ts           # BetterAuth server config
│   ├── auth-client.ts    # BetterAuth client
│   ├── auth-helpers.ts   # Auth helper functions
│   ├── db/               # Database schema
│   └── supabase.ts       # Supabase client
├── supabase/             # Database files
│   ├── migrations/       # SQL migration files
│   └── seed.sql          # Seed data
└── public/               # Static assets
```

## Development

### Running Tests

Tests are not included in the MVP but can be added using:
- Jest + React Testing Library for unit tests
- Cypress for E2E tests

### Linting

```bash
npm run lint
```

### Building for Production

```bash
npm run build
npm start
```

## Troubleshooting

### BetterAuth Tables Not Created

If BetterAuth tables are not created automatically, make sure:
1. `POSTGRES_CONNECTION_STRING` is correct
2. The connection string has proper permissions
3. Run the migration `002_better_auth_schema.sql` manually

### Google OAuth Not Working

1. Verify redirect URIs match exactly (including protocol and port)
2. Check that Google+ API is enabled
3. Verify Client ID and Secret are correct
4. Check browser console for errors

### Database Connection Issues

1. Verify Supabase connection string format
2. Check that your IP is whitelisted in Supabase (if using IP restrictions)
3. Ensure database is accessible from your network
4. **If you see "ENOTFOUND" errors:**
   - Verify the hostname in your connection string is correct
   - Make sure special characters in the password are URL-encoded
   - Try using the Direct connection (port 5432) instead of Connection pooling
   - Check your network/firewall settings

## License

MIT

## Support

For issues and questions, please open an issue on the repository.
