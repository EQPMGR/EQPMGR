-- Migration 018: automatic Strava sync.
--
-- 1. equipment.strava_gear_id links a bike to a Strava bike, so webhook rides
--    are assigned automatically. Learned when a rider assigns a ride by hand,
--    or matched by bike name.
-- 2. strava_webhook_events: every event Strava pushes, stored first and then
--    processed (Strava expects a reply within 2 seconds and retries).


alter table equipment add column if not exists strava_gear_id text;
alter table equipment add column if not exists strava_gear_name text;
create unique index if not exists equipment_user_strava_gear_idx
  on equipment (user_id, strava_gear_id) where strava_gear_id is not null;

create table if not exists strava_webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  object_type text not null,
  aspect_type text not null,
  object_id bigint not null,
  owner_id bigint not null,
  event_time bigint,
  updates jsonb,
  status text not null default 'pending' check (status in ('pending', 'processed', 'skipped', 'failed')),
  result text,
  attempts int not null default 0,
  processed_at timestamptz,
  unique (object_type, object_id, aspect_type, event_time)
);
create index if not exists strava_webhook_events_owner_idx on strava_webhook_events (owner_id, status);

alter table strava_webhook_events enable row level security;
-- No policies: service role only.
revoke all on strava_webhook_events from anon, authenticated;
