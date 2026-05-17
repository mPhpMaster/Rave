-- Checkpoint 5: storage bucket for MP4 uploads.

insert into storage.buckets (id, name, public)
values ('room-videos', 'room-videos', false)
on conflict (id) do nothing;

-- Authenticated users can upload only into their own folder (= auth.uid()).
drop policy if exists "rv_upload_own_folder" on storage.objects;
create policy "rv_upload_own_folder" on storage.objects for insert to authenticated
with check (
  bucket_id = 'room-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users may delete only their own uploads.
drop policy if exists "rv_delete_own" on storage.objects;
create policy "rv_delete_own" on storage.objects for delete to authenticated
using (
  bucket_id = 'room-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- No SELECT policy: bucket stays private. Socket.IO server mints signed URLs
-- (service-role) and embeds them in room:snapshot.
