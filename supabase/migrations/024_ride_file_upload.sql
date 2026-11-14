-- Migration 024: rides uploaded as .FIT / .GPX / .TCX files.
--
-- A third ride source next to Strava and manual entry. Files come straight
-- from the rider's own device export, so these rides never pass through
-- Strava's API. Keeping `source` on every ride lets any future data use pick
-- only the rides it is allowed to use.
--
-- external_id for a file ride is "<user id>:<sha-256 of the file>", so the same
-- file can't be counted twice, while two riders uploading the same group-ride
-- file stay separate.

alter table rides drop constraint if exists rides_source_check;
alter table rides add constraint rides_source_check
  check (source in ('strava', 'manual', 'file'));

-- The upload limit counts a rider's recent file rides.
create index if not exists rides_user_source_created_idx on rides (user_id, source, created_at desc);
