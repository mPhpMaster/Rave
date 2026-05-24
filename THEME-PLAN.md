# Rave 2024 Theme Rollout — Implementation Plan

Bring the running app (`apps/web`) in line with the 2024 design system in
[`theme/theme.md`](theme/theme.md) and the reference screenshots
(`theme/IMG_9192–9195.png`).

> **Scope note:** This is a **UI-only** rollout. No database, schema, or
> Socket.IO/server changes are required for any phase — all work is in
> `apps/web`. Logos come from the **`simple-icons`** package (decided).

---

## 0. Current state — what already exists

`theme.md`'s *tokens* are already implemented; **do not rebuild them**.

| Spec area | Where it lives today |
|---|---|
| Colors (`#0B0B10`, purple `#8B5CF6`, pink `#EC4899`, electric, success) | `tailwind.config.ts` → `surface.*`, `ink.*`, `purple`, `pink`, `electric`, `success` |
| Glassmorphism | `globals.css` → `.glass`, `.glass-strong` |
| Pill / gradient buttons + glow | `globals.css` → `.btn-primary`, `.btn-ghost`; `tailwind` → `shadow-glow-purple/pink`, `bg-brand-gradient` |
| Radial blob background, dark scrollbars, smooth scroll, `::selection` | `globals.css` (`body::before`, `::-webkit-scrollbar`) |
| Radii (`xs` 8px, `pill`), backdrop blur (`glass`/`panel`) | `tailwind.config.ts` |
| Animations `fade-in`, `slide-up`, `glow-pulse` | `tailwind.config.ts` |
| Inter font | `tailwind.config.ts` `fontFamily.sans` (`--font-inter`) |

**The gap is application, not foundation:** the screenshots show specific
mobile-first, video-first UI patterns the current screens don't implement.

### What each screenshot shows
- **IMG_9192 / IMG_9194** — a **source picker as a 2-column brand-logo grid**, a **public room-browser feed** (poster thumbnails, member counts, badges, "+" FAB), and a Netflix sign-in.
- **IMG_9193 ("Chat by text or voice")** — in-room: video on top, **invite-friends row** (Rave/SMS/WhatsApp/Messenger), chat under the video, **voice mic FAB**, bottom control row (link / share / globe).
- **IMG_9195 ("Sync your music")** — in-room chat with **emoji reactions**, avatars, mic FAB, bottom controls.

### Current screens (baseline to evolve)
- `app/page.tsx` — minimal hero + CTA; footer reads "Checkpoint 1".
- `components/TopBar.tsx` — text-only sticky bar (logo / profile / sign-out).
- `app/dashboard/page.tsx` — plain text-card grid, "New room" button.
- `app/dashboard/create/CreateRoomForm.tsx` — **text pill** source buttons (from `lib/sources.ts` `SOURCES`).
- `components/room/RoomShell.tsx` — desktop two-column grid (`lg:grid-cols-[1fr_360px]`).

---

## Asset foundation (do first, used by Phases 1–2)

Add brand logos via `simple-icons`.

1. `pnpm --filter @rave/web add simple-icons`
2. New `apps/web/src/lib/brandIcons.tsx` — map each `VideoProvider` to a logo:
   - `youtube → siYoutube`, `netflix → siNetflix`, `vimeo → siVimeo`,
     `twitch → siTwitch`, `reddit → siReddit`, `gdrive → siGoogledrive`,
     `twitter → siX`.
   - `mp4 → ` Lucide `Upload`/`FileVideo` glyph (no brand mark).
   - `pluto`, `tubi → ` no simple-icon → **styled wordmark fallback** (brand-colored text on the tile) + generic Lucide `Tv` glyph.
   - Export `<BrandMark provider size className />` that renders the SVG path
     (`<svg viewBox="0 0 24 24"><path d={icon.path}/></svg>`) with `fill` =
     `currentColor` by default, or `#${icon.hex}` when full-color is wanted.
3. Extend `SourceDef` in `lib/sources.ts` with optional UI metadata:
   `brandHex?: string` (tile accent/glow color) so tiles can glow in-brand.

---

## Phase 1 — Source-picker grid  *(recommended start)*

Rebuild the create-room source selector as the brand-tile grid from the
screenshots.

**Files:** `app/dashboard/create/CreateRoomForm.tsx`, `lib/sources.ts`
(metadata), `lib/brandIcons.tsx`.

**Steps**
- Replace the `ProviderButton` text row with a responsive grid
  (`grid-cols-2 sm:grid-cols-3 gap-3`) of `<SourceTile>` cards.
- Each tile: `.glass` card, `rounded-2xl`, `aspect-[4/3]` or `min-h`, centered
  `<BrandMark>` over the source label; "soon" badge for `comingSoon` sources.
- Active state: brand-colored border + `shadow-glow-*`; hover: `-translate-y-0.5`
  + brighter glow (`transition-all .25s`).
- Keep all existing logic untouched: selecting a tile sets `provider`; the
  URL/file input + `source.parse` validation below the grid is unchanged.

**Acceptance:** all sources render as logo tiles; selection + validation +
create still work; `tsc` + `next lint` clean.

---

## Phase 2 — Room browser feed

Turn the dashboard into the poster-thumbnail feed from IMG_9192/9194.

**Files:** `app/dashboard/page.tsx`, new `components/dashboard/RoomCard.tsx`,
new `components/dashboard/CreateFab.tsx`, optional
`lib/thumbnails.ts`.

**Steps**
- `RoomCard`: poster thumbnail + title + host/`is_public` "live"/"public"
  badge + member count, glass card, hover lift/glow.
- Thumbnail helper by provider: YouTube → `img.youtube.com/vi/<id>/hqdefault.jpg`;
  others → branded gradient placeholder with `<BrandMark>` (no thumbnail API).
- Add a floating `+` FAB (bottom-right, brand gradient, glow) linking to
  `/dashboard/create`; keep the header "New room" link for desktop.
- Mobile-first single column → `sm:grid-cols-2 lg:grid-cols-3`.
- Requires `is_public` in the dashboard query (currently selects
  `id, name, host_id, video_provider, created_at` — add `is_public`).

**Acceptance:** rooms show as cards with thumbnails/badges; FAB navigates to
create; empty state retained.

---

## Phase 3 — Video-first room (mobile-first)

Restructure the room to "content first, people second, controls third"
(theme.md §1) per IMG_9193/9195.

**Files:** `components/room/RoomShell.tsx`, new
`components/room/RoomTopBar.tsx`, new `components/room/RoomControls.tsx`,
touch `ChatPanel.tsx`, `MemberList.tsx`, `InviteButton.tsx`, `VoicePanel.tsx`.

**Steps**
- **Mobile (default):** stack — sticky in-room top bar (✕ close → `/dashboard`,
  gear, centered logo, search, add-members) → full-width video → bottom
  control cluster (−10s / +10s / share-screen / mic FAB / link-invite) →
  chat panel beneath, collapsible.
- **Desktop (`lg:`):** keep the two-column grid but move host controls into the
  shared `RoomControls` so both layouts use one component.
- Add the **invite-friends row** (reuse `InviteButton` + share targets) as a
  compact action set near the top bar's add-members button.
- Mic FAB wires to the existing `VoicePanel`/LiveKit hook (gated on
  `liveKitUrl`), styled as a circular glass/gradient button like the
  screenshots.
- No changes to sync, socket, or playback logic — purely structural/visual.

**Acceptance:** room is usable and good-looking at 390px width; all existing
controls (seek, screen-share, chat, voice, invite) still function; host/guest
behavior unchanged.

---

## Phase 4 — Landing + global nav

**Files:** `app/page.tsx`, `components/TopBar.tsx`, new
`components/BottomTabs.tsx` (mobile).

**Steps**
- Landing: layered blurred blobs, floating app-mockup imagery (can reuse the
  `theme/IMG_*` shots or device frames), section reveals via `animate-slide-up`;
  remove the "Checkpoint 1" footer; stronger glowing CTA.
- `TopBar`: add icon affordances (search, notifications, avatar menu) using
  Lucide; keep it glassy and sticky.
- Mobile **bottom tab bar** (Home / Browse / Create / Profile) — floating,
  icon-focused (theme.md §16), shown under `lg`.

**Acceptance:** landing reads as a Gen-Z night-time product, not a checkpoint
demo; nav works on mobile + desktop.

---

## Phase 5 — Presence & micro-feedback polish

**Files:** `components/room/MemberList.tsx`, `ChatPanel.tsx`, new
`components/room/Reactions.tsx`, `globals.css` (motion utilities).

**Steps**
- Avatars + online dots in member list; presence emphasis (theme.md §24).
- Floating emoji reactions over the video (client-only first; optional later
  `chat:reaction` socket event if we want them shared — would be the *only*
  server touch in the whole plan, flagged as out-of-scope unless requested).
- Hover/tap micro-interactions, `prefers-reduced-motion` guard, optional subtle
  haptics on mobile (`navigator.vibrate`).

**Acceptance:** the room "feels alive" (theme.md §15/§19) without new clutter.

---

## Cross-cutting requirements (every phase)

- **Mobile-first** (theme.md §18): default styles target phones; layer `sm:` /
  `lg:` up. Large tap targets, bottom-centered actions.
- **Reuse tokens**: use existing `.glass`, `.btn-*`, `shadow-glow-*`,
  `bg-brand-gradient`, `animate-*` — avoid one-off hex values.
- **Accessibility**: keep focus styles, `aria-*` on icon-only buttons, respect
  `prefers-reduced-motion`.
- **Verify each phase**: `pnpm --filter @rave/web typecheck` + `lint`, then run
  `pnpm dev` and eyeball at mobile (≈390px) and desktop widths. No phase should
  regress sync, auth, or chat.

## Suggested order & checkpoints

Asset foundation → **P1 (source grid)** → P2 (browser feed) → P3 (room layout)
→ P4 (landing/nav) → P5 (polish). Each phase is independently shippable; stop
and review after each.
