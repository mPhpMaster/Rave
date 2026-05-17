-- Rave — Checkpoint 1 schema
-- Run in Supabase SQL editor. Idempotent (safe to re-run).

-- ============================================================
-- profiles: 1:1 mirror of auth.users with app-side fields
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever an auth.user is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  suffix int := 0;
begin
  base_username := coalesce(
    new.raw_user_meta_data ->> 'username',
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'user'
  );

  candidate := base_username;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || '_' || suffix::text;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, candidate);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS: profiles are world-readable, self-writable.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- rooms
-- ============================================================
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  host_id uuid not null references public.profiles(id) on delete cascade,
  is_public boolean not null default false,
  video_provider text not null check (video_provider in ('youtube', 'mp4', 'vimeo')),
  video_url text not null,
  invite_code text unique not null default replace(replace(encode(gen_random_bytes(6), 'base64'), '/', '_'), '+', '-'),
  created_at timestamptz not null default now()
);
create index if not exists rooms_host_id_idx on public.rooms (host_id);
create index if not exists rooms_invite_code_idx on public.rooms (invite_code);

alter table public.rooms enable row level security;

-- ============================================================
-- room_members
-- ============================================================
create table if not exists public.room_members (
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'guest' check (role in ('host', 'guest')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists room_members_user_id_idx on public.room_members (user_id);

alter table public.room_members enable row level security;

-- Auto-add host as a room member when the room is created.
create or replace function public.add_host_as_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.room_members (room_id, user_id, role)
  values (new.id, new.host_id, 'host')
  on conflict (room_id, user_id) do update set role = 'host';
  return new;
end;
$$;

drop trigger if exists on_room_created on public.rooms;
create trigger on_room_created
  after insert on public.rooms
  for each row execute procedure public.add_host_as_member();

-- RLS policies
-- Rooms: select if public OR host OR member; insert if you're the host; update if you're the host.
drop policy if exists "rooms_select_public_or_member" on public.rooms;
create policy "rooms_select_public_or_member" on public.rooms for select using (
  is_public
  or host_id = auth.uid()
  or exists (
    select 1 from public.room_members rm
    where rm.room_id = rooms.id and rm.user_id = auth.uid()
  )
);

drop policy if exists "rooms_insert_self_host" on public.rooms;
create policy "rooms_insert_self_host" on public.rooms for insert with check (host_id = auth.uid());

drop policy if exists "rooms_update_host" on public.rooms;
create policy "rooms_update_host" on public.rooms for update using (host_id = auth.uid());

drop policy if exists "rooms_delete_host" on public.rooms;
create policy "rooms_delete_host" on public.rooms for delete using (host_id = auth.uid());

-- Room members: a user can only see their own membership rows.
-- NOTE: this MUST stay free of any reference to public.rooms — otherwise we
-- form a cycle with rooms_select_public_or_member and Postgres errors with
-- "42P17 infinite recursion in policy". Host-side listing of OTHER members
-- is served by the Socket.IO server (service-role client, bypasses RLS).
drop policy if exists "rm_select_self_or_host" on public.room_members;
drop policy if exists "rm_select_self" on public.room_members;
create policy "rm_select_self" on public.room_members for select using (
  user_id = auth.uid()
);

drop policy if exists "rm_insert_self" on public.room_members;
create policy "rm_insert_self" on public.room_members for insert with check (user_id = auth.uid());

drop policy if exists "rm_delete_self" on public.room_members;
create policy "rm_delete_self" on public.room_members for delete using (user_id = auth.uid());

-- ============================================================
-- messages
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_room_created_idx
  on public.messages (room_id, created_at desc);

alter table public.messages enable row level security;

-- A user can only see messages from rooms they belong to.
-- The room_members membership check is one-directional (rm.select policy
-- does NOT reference rooms, so we don't reintroduce the recursion).
drop policy if exists "msg_select_member" on public.messages;
create policy "msg_select_member" on public.messages for select using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = messages.room_id and rm.user_id = auth.uid()
  )
);

-- Server inserts via service-role client; this policy keeps direct client
-- inserts safe in case someone bypasses the socket. Self + must be a member.
drop policy if exists "msg_insert_self_member" on public.messages;
create policy "msg_insert_self_member" on public.messages for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.room_members rm
    where rm.room_id = messages.room_id and rm.user_id = auth.uid()
  )
);
