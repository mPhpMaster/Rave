-- Checkpoint 4: friendships table + join_via_invite RPC.

create table if not exists public.friendships (
  user_a uuid references public.profiles(id) on delete cascade,
  user_b uuid references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b),
  check (requested_by in (user_a, user_b))
);
create index if not exists friendships_user_b_idx on public.friendships (user_b);

alter table public.friendships enable row level security;

drop policy if exists "fr_select_self" on public.friendships;
create policy "fr_select_self" on public.friendships for select using (
  auth.uid() in (user_a, user_b)
);

drop policy if exists "fr_insert_self" on public.friendships;
create policy "fr_insert_self" on public.friendships for insert with check (
  auth.uid() = requested_by
  and auth.uid() in (user_a, user_b)
);

drop policy if exists "fr_update_self" on public.friendships;
create policy "fr_update_self" on public.friendships for update using (
  auth.uid() in (user_a, user_b)
);

drop policy if exists "fr_delete_self" on public.friendships;
create policy "fr_delete_self" on public.friendships for delete using (
  auth.uid() in (user_a, user_b)
);

create or replace function public.join_via_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select id into v_room from public.rooms where invite_code = p_code;
  if v_room is null then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.room_members (room_id, user_id, role)
  values (v_room, auth.uid(), 'guest')
  on conflict (room_id, user_id) do nothing;

  return v_room;
end;
$$;

grant execute on function public.join_via_invite(text) to authenticated;
