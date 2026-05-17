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

## Optional features

- **Voice chat (LiveKit)**: create a project at https://cloud.livekit.io, then set `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` in `apps/server/.env` and `NEXT_PUBLIC_LIVEKIT_URL` in `apps/web/.env.local`. The Voice panel appears in the room sidebar.
- **Multi-instance Socket.IO (Redis)**: set `REDIS_URL` in `apps/server/.env`. Without it the server runs single-instance; with it broadcasts span instances via `@socket.io/redis-adapter`.

## Containerized run

`docker-compose.yml` boots Redis + server + web together. Set the same env vars as `pnpm dev` in your shell (or a root `.env`) and run:

```
docker compose up --build
```

The web image uses Next.js `output: "standalone"` so the runtime image is slim. **Note**: `NEXT_PUBLIC_*` vars are inlined at build time — rebuild the web image when they change.

## Deploying

The repo is wired for local dev; the pieces below are the path to production but aren't automated yet.

- **Web (Next.js) → Vercel.** Point Vercel at `apps/web` (set the root). Set `NEXT_PUBLIC_*` env vars in the project (they're build-time). `vercel.json` not included — Vercel detects Next.js automatically.
- **Server → Railway / Fly.** Build using `apps/server/Dockerfile`. Required envs: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WEB_ORIGIN` (your production web origin), optionally `LIVEKIT_*` and `REDIS_URL`. For horizontal scaling, add a managed Redis (Upstash, Railway Redis) and set `REDIS_URL`.
- **Caveat — server state**: playback state and member presence still live in-process Maps. The Socket.IO Redis adapter only routes broadcasts across instances; mutable state doesn't yet replicate. For multi-instance deploys today, terminate WS connections with sticky sessions (one room ↔ one instance). A future migration would move `rooms.ts` state into Redis hashes for true statelessness.
- **MP4 storage**: Supabase Storage is plenty for hobby use. Behind a busier deployment, front the bucket with Cloudflare / Bunny / CloudFront. Server signed URLs (24h TTL) work transparently behind a CDN that caches by URL.
- **TURN for screen share**: current ICE config is STUN-only. Cross-NAT setups need TURN (Twilio, Cloudflare TURN, or self-hosted coturn). Plug the credentials into the `ICE_CONFIG` in `useScreenShareHost.ts` / `useScreenShareViewer.ts`.
