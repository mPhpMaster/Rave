-- Checkpoint 3: messages table + RLS. Run in Supabase SQL editor.

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

drop policy if exists "msg_select_member" on public.messages;
create policy "msg_select_member" on public.messages for select using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = messages.room_id and rm.user_id = auth.uid()
  )
);

drop policy if exists "msg_insert_self_member" on public.messages;
create policy "msg_insert_self_member" on public.messages for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.room_members rm
    where rm.room_id = messages.room_id and rm.user_id = auth.uid()
  )
);
