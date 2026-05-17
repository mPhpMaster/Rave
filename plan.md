# Build a Rave-like Watch Party App

## Context

The working directory `c:\Users\Administrator\Downloads\rave` is empty except for [a.md](a.md), a how-to guide for building "Rave" — a real-time synchronized watch party platform where users share rooms, watch videos in sync, and chat. The user wants to actually build it.

**User decisions:**
- **Scope:** Full Rave clone across all phases — but built in phased checkpoints, not in one shot.
- **Stack:** Doc's recommended stack — Next.js + Tailwind + Node/Express + Socket.IO + Supabase.
- **Deployment:** Local dev only for now (`npm run dev`). No Vercel/Railway/Docker yet.
- **Voice:** Deferred. LiveKit is the future choice but not in the initial checkpoints.

The goal is a runnable demo at each checkpoint, building up from auth shell → synced YouTube playback → chat → friends → MP4 upload → screen share, leaving voice and production hosting for later.

---

## 1. Repo Layout

Two apps in an npm-workspaces monorepo (npm ships with Node — no extra tooling).

```
rave/
├── package.json                # workspace root + dev scripts (npm-run-all parallel)
├── .env.example
├── apps/
│   ├── web/                    # Next.js 14 App Router + Tailwind + TS
│   │   ├── middleware.ts
│   │   └── src/{app,components,lib/supabase,hooks,types}
│   └── server/                 # Express + Socket.IO + TS (ts-node-dev)
│       └── src/{index.ts,auth.ts,rooms.ts,handlers,lib,types}
```

Root scripts:
```json
"dev": "npm-run-all -p dev:web dev:server",
"dev:web":    "npm --workspace apps/web run dev",
"dev:server": "npm --workspace apps/server run dev"
```

Defer a `packages/shared` until event types start drifting between apps. For now, mirror the event types in both `apps/web/src/types/events.ts` and `apps/server/src/types/events.ts`.

---

## 2. Supabase Schema

Apply in the Supabase SQL editor. Full DDL in the Plan agent's design — key tables:

- `public.profiles` — 1:1 with `auth.users`, auto-created via trigger `on_auth_user_created` calling `handle_new_user()`.
- `public.rooms` — `id, name, host_id, is_public, video_provider ∈ {youtube,mp4,vimeo}, video_url, invite_code` (default `encode(gen_random_bytes(6),'base64')` — sanitize to URL-safe).
- `public.room_members` — `(room_id, user_id, role ∈ {host,guest}, joined_at)`.
- `public.messages` — `id, room_id, user_id, body (1–2000 chars), created_at`.
- `public.friendships` — `(user_a, user_b)` with `check (user_a < user_b)` so each friendship stored once.
- `public.watch_history` — `id, user_id, room_id, video_url, watched_at`.

**RLS** enabled on all tables. Notable policies:
- `profiles`: world-readable, self-writable.
- `rooms`: select if `is_public`, host, or member.
- `messages`: insert/select only if requester is in `room_members`.

**RLS gotchas (must respect):**
- Service-role client (server) bypasses RLS — verify membership in app code, don't rely on RLS server-side.
- Don't make `rooms.select` reference `room_members` AND `room_members.select` reference `rooms` — Postgres errors with `42P17 infinite recursion`. Keep dependency one-directional.
- Supabase Realtime channels honor RLS. Insert into `room_members` BEFORE subscribing or payloads come back empty.

---

## 3. Auth Flow

**Frontend** — use **`@supabase/ssr`** (`auth-helpers-nextjs` is deprecated):
- `apps/web/src/lib/supabase/server.ts` — `createServerClient(cookies())` for RSCs and route handlers.
- `apps/web/src/lib/supabase/client.ts` — `createBrowserClient` for client components.
- `apps/web/middleware.ts` — refresh session cookie + guard `/dashboard`, `/room/[id]`.
- `/login` calls `supabase.auth.signInWithOAuth({ provider: 'google' | 'discord' })` and `signInWithPassword`.
- `apps/web/src/app/auth/callback/route.ts` runs `exchangeCodeForSession(code)`. Configure redirect URL `http://localhost:3000/auth/callback` in Supabase.

**Backend (Socket.IO JWT verification)** — `apps/server/src/auth.ts`:
```ts
const { data, error } = await supabaseAdmin.auth.getUser(socket.handshake.auth.token);
if (error || !data.user) return next(new Error('invalid token'));
socket.data.userId = data.user.id;
```
Client passes token via `io(url, { auth: { token: session.access_token } })`. Reconnect with fresh token on rotation. (Optimization later: verify the JWT locally with the project's `JWT_SECRET` + `jsonwebtoken` to skip the network call.)

**Service-role key MUST NEVER ship to the browser** — only in `apps/server/.env`.

---

## 4. Socket.IO Event Contract

All events room-scoped via `socket.join(`room:${roomId}`)`. Server is the authority — even host emissions are validated server-side and re-broadcast (never client→client). Server stamps outbound events with `serverTs = Date.now()` for latency compensation.

**Client → Server:**
- `room:join { roomId }` → ack `RoomSnapshot`
- `room:leave { roomId }`
- `playback:play|pause|seek { roomId, t }` — **host only**, rejected otherwise
- `playback:state { roomId, t, paused }` — host heartbeat every ~2s
- `chat:message { roomId, body }` — body ≤ 2000 chars
- `chat:typing { roomId, isTyping }` — throttle 1/sec

**Server → Client (broadcast):**
- `room:snapshot` (to joining socket only) — `{ roomId, hostId, members, playback: { t, paused, serverTs }, videoProvider, videoUrl }`
- `user:joined`, `user:left`
- `playback:play|pause|seek|state { t, paused?, serverTs }`
- `chat:message { id, userId, username, body, createdAt }`
- `chat:typing { userId, isTyping }`
- `error { code, message }`

---

## 5. Sync Algorithm

In-memory per room on server: `{ hostId, t, paused, lastUpdate }`.

**Host:** emits on user action; heartbeats `playback:state` every 2s.

**Server:** validates `socket.data.userId === room.hostId`, updates state, broadcasts with fresh `serverTs`.

**Guests run drift correction every 1.5s using `setInterval` (NOT `requestAnimationFrame` — RAF is throttled to 1Hz in hidden tabs):**
```ts
const elapsed  = (Date.now() - remote.serverTs) / 1000;
const expected = remote.paused ? remote.t : remote.t + elapsed;
const drift    = Math.abs(player.getCurrentTime() - expected);

if (remote.paused !== player.paused) remote.paused ? player.pause() : player.play();
if (drift > 0.5) player.seekTo(expected, /*allowSeekAhead*/ true);
```

`+ elapsed` compensates for network latency between server stamp and client receive. Clients only ever reconcile against `serverTs`-stamped state — never against each other.

Edge cases (see §11) — coalesce stale events by `serverTs`, skip reconcile while BUFFERING, promote new host on disconnect.

---

## 6. YouTube Player

Use **`react-youtube`** (thin wrapper over YT IFrame API). Direct access to `playVideo / pauseVideo / seekTo(t, true) / getCurrentTime / getPlayerState`.

Files:
- `apps/web/src/components/player/YouTubePlayer.tsx` — imperative ref API.
- `apps/web/src/components/player/RoomPlayer.tsx` — picks YouTube vs MP4 by `room.video_provider`.

Constraints to handle:
- Autoplay blocked with sound → start guests muted (`playerVars.mute = 1`) with an "Unmute" button.
- Queue commands until `onReady` fires — `seekTo` before ready silently fails.
- Ignore reconcile while state is BUFFERING.
- Gate the room behind a "Join Watch Party" button so the first `play()` is a user gesture (mobile Safari requirement).
- Validate the URL on room create via `https://www.youtube.com/oembed?url=...` (reject embed-disabled videos).

---

## 7. MP4 Upload (Phase 5)

Supabase Storage bucket `room-videos` (private). Policy: authenticated users can upload to `${userId}/...`. Server mints **signed URLs** (24h TTL) in `room:snapshot`.

Files end up at `${userId}/${uuid}.mp4`. `Mp4Player` component renders `<video>` (Video.js optional for theming). Cap upload size at 100MB for v1 — Supabase free tier limits storage to ~1GB and ~50MB/file by default; document this in README.

---

## 8. UI Pages

```
apps/web/src/app/
├── page.tsx                     # / landing
├── login/page.tsx               # /login
├── auth/callback/route.ts       # OAuth exchange
├── dashboard/
│   ├── page.tsx                 # list rooms, "Create", "Join by code"
│   └── create/page.tsx          # form: provider toggle, URL/upload, public
├── room/
│   ├── [id]/page.tsx            # server-fetches room + verifies membership
│   └── join/[code]/page.tsx     # resolve code → insert member → redirect
└── profile/page.tsx             # username, avatar, watch history, friends
```

Key components:
- `RoomPlayer` / `YouTubePlayer` / `Mp4Player`
- `ChatPanel` (uses `emoji-mart`) + `TypingIndicator`
- `MemberList` with host badge
- `HostControls` (visible only to host)
- `SocketProvider` (root layout for authed routes — one socket per session, exposed via React context)
- `CreateRoomForm`, `RoomCard`, `InviteButton`
- `FriendList`, `FriendSearch` (Phase 4)

Styling: Tailwind + `lucide-react` icons + `clsx`/`tailwind-merge` `cn()` helper.

---

## 9. Implementation Checkpoints

Each checkpoint is a runnable demo via `npm run dev` from repo root.

| CP | Goal |
|---|---|
| **1** | Scaffold + workspaces; Supabase project; `profiles` + trigger; `@supabase/ssr` middleware; `/`, `/login`, `/dashboard` (empty), `/profile` shells; email + Google OAuth; server boots with `GET /health` and Socket.IO JWT auth (no handlers yet). |
| **2** | `rooms` + `room_members`; `/dashboard/create` (YouTube only); `/room/[id]` with `RoomPlayer` + `YouTubePlayer`; server `playback:*` + `room:*` handlers; drift correction loop; host vs guest controls. |
| **3** | `messages` table + RLS; `handlers/chat.ts`; `ChatPanel` with emoji picker; `chat:typing` throttled; on `room:join` server returns last 50 messages. |
| **4** | `friendships` table; `/profile` friend search + send/accept/decline; `InviteButton`; `/room/join/[code]` handler (insert member THEN redirect). |
| **5** | Supabase Storage bucket + policies; MP4 upload from `/dashboard/create`; signed URLs in `room:snapshot`; `Mp4Player` component. |
| **6** | WebRTC P2P screen share via `getDisplayMedia()`; signaling via `webrtc:offer/answer/ice` events relayed by server; mesh topology, hard cap 6 viewers. |
| **7 (deferred)** | Voice via LiveKit — server mints LiveKit JWTs; frontend uses `@livekit/components-react`. |
| **8 (deferred)** | `@socket.io/redis-adapter`, Redis-backed room registry, Vercel + Railway hosting, CDN for MP4s. |

---

## 10. Verification per Checkpoint

**Always use two different browsers** (or normal + incognito) as different users — same-browser tabs share Supabase localStorage and cause confusing session bleed.

| CP | Manual test |
|---|---|
| 1 | Sign up email + Google in two browsers. `/dashboard` persists across refresh. `GET http://localhost:3001/health` → 200. DevTools → WS frame shows Socket.IO upgrade. Sign out → redirected to `/login`. |
| 2 | A creates room → B joins → both see member list of 2. A pauses → B pauses ≤300ms. A seeks to 1:30 → B jumps to 1:30. Throttle B's network → B resyncs within 2s. Refresh B → snapshot restores position. |
| 3 | A types in chat → B sees it with timestamp. Typing indicator works. Reload → last 50 messages visible. Empty / 3000-char messages rejected with `error` toast. |
| 4 | A searches B by username, friend request appears, B accepts. A's invite link in another browser lands B directly in room. DB row has `user_a < user_b`. |
| 5 | Upload 20MB MP4 → file at `${userId}/${uuid}.mp4` in Storage. B joins, video plays. Sync works. Network tab shows signed URL with `?token=...`, 401s without it. |
| 6 | Host shares screen → viewer sees stream <2s. `chrome://webrtc-internals` shows SRTP packets. Stop sharing → viewer falls back. |

Also spot-check via SQL: `select * from public.messages order by created_at desc limit 20;`, `select * from public.room_members where room_id = '...';`.

---

## 11. Known Hard Parts

**Drift correction**
- Host pauses then immediately seeks — coalesce by `serverTs`; if incoming `serverTs ≤ last applied`, drop.
- Tab backgrounding — `setInterval`, not RAF.
- Buffering oscillation — skip reconcile while BUFFERING; if buffering >5s, send `playback:rebuffer` so host can pause everyone.
- Host disconnect — promote earliest-joined `room_members` row to host; broadcast `room:host_changed`. Freeze playback in the gap.

**YouTube quirks**
- `seekTo` before `onReady` fires → silently no-op. Queue commands.
- `getCurrentTime` returns ad timecode during ads — pollutes heartbeats. Detect via state + duration heuristic; pause heartbeats during ads.
- Embed-disabled videos → `onError` code 101/150. Validate at room-create with `oembed`.
- Mobile Safari → first `playVideo()` must be user-gesture. Gate guests behind a button.

**Supabase RLS**
- Service-role client has null `auth.uid()` — server-side membership checks must be explicit.
- One-directional policy dependency between `rooms` and `room_members` (or `42P17 infinite recursion`).
- `gen_random_bytes()` base64 contains `/` and `+` — URL-unsafe. Sanitize or generate `nanoid` server-side.

**Misc**
- `transports: ['websocket']` only in dev (no long-polling fallback).
- Socket.IO needs its own CORS config separate from Express.
- Service-role key NEVER in `apps/web/.env.local`.

---

## Critical Files

To be created during execution (none exist yet):
- [package.json](package.json) — workspace root
- [apps/web/middleware.ts](apps/web/middleware.ts)
- [apps/web/src/lib/supabase/server.ts](apps/web/src/lib/supabase/server.ts)
- [apps/web/src/lib/supabase/client.ts](apps/web/src/lib/supabase/client.ts)
- [apps/web/src/hooks/useRoomSync.ts](apps/web/src/hooks/useRoomSync.ts)
- [apps/web/src/components/player/RoomPlayer.tsx](apps/web/src/components/player/RoomPlayer.tsx)
- [apps/web/src/components/player/YouTubePlayer.tsx](apps/web/src/components/player/YouTubePlayer.tsx)
- [apps/web/src/components/chat/ChatPanel.tsx](apps/web/src/components/chat/ChatPanel.tsx)
- [apps/server/src/index.ts](apps/server/src/index.ts)
- [apps/server/src/auth.ts](apps/server/src/auth.ts)
- [apps/server/src/handlers/playback.ts](apps/server/src/handlers/playback.ts)
- [apps/server/src/handlers/chat.ts](apps/server/src/handlers/chat.ts)
- [apps/server/src/handlers/presence.ts](apps/server/src/handlers/presence.ts)
- [apps/server/src/types/events.ts](apps/server/src/types/events.ts) (mirrored at [apps/web/src/types/events.ts](apps/web/src/types/events.ts))

Reference doc (existing): [a.md](a.md)

---

## Verification (end-to-end)

After each checkpoint, run `npm run dev` from the repo root — both Next.js (`:3000`) and the Socket.IO server (`:3001`) should boot in parallel. Use the table in §10 with two browsers. End-state for the initial build is Checkpoint 6 (screen share working, voice still deferred).
