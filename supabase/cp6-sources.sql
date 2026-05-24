-- Checkpoint 6: allow more video sources in rooms.video_provider.
-- Adds twitch, gdrive (Google Drive), reddit, twitter (X), pluto (Pluto TV),
-- tubi, netflix alongside the original youtube / mp4 / vimeo.

-- Drop the original inline check (Postgres auto-names it rooms_video_provider_check),
-- then re-add it with the expanded allow-list under a stable name.
alter table public.rooms
  drop constraint if exists rooms_video_provider_check;

alter table public.rooms
  drop constraint if exists rooms_video_provider_allowed;

alter table public.rooms
  add constraint rooms_video_provider_allowed
  check (video_provider in (
    'youtube', 'mp4', 'vimeo', 'twitch', 'gdrive', 'reddit', 'twitter',
    'pluto', 'tubi', 'netflix'
  ));
