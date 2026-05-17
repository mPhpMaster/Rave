# Rave — Watch Party

Real-time synchronized watch party app. See [a.md](a.md) for the original spec and the plan file for build phases.

## Stack

- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Backend: Node.js + Express + Socket.IO + TypeScript
- Auth + DB: Supabase (Postgres + Auth)
- Local dev only for now

## Setup

1. Create a Supabase project at https://supabase.com.
2. In the SQL editor, run [supabase/schema.sql](supabase/schema.sql).
3. Copy `.env.example` to `apps/web/.env.local` and `apps/server/.env` and fill in the keys.
4. Install deps (pnpm via corepack — workaround for npm 10.9.4 + Node 22 minizlib bug):
   ```
   corepack enable
   pnpm install
   ```
5. Run both apps:
   ```
   pnpm dev
   ```
   - Web: http://localhost:3000
   - Server: http://localhost:3001 (health: /health)

## Testing sync (CP2+)

Always use **two different browsers** (or normal + incognito) signed in as different users. Same-browser tabs share Supabase session storage.
