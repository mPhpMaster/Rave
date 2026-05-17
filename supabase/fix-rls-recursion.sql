-- Apply this in the Supabase SQL editor to fix the infinite-recursion error.
-- Drops the bidirectional reference between rooms and room_members policies.

drop policy if exists "rm_select_self_or_host" on public.room_members;
drop policy if exists "rm_select_self" on public.room_members;

create policy "rm_select_self" on public.room_members for select using (
  user_id = auth.uid()
);
