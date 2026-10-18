-- Migration 018: automatic Strava sync and wear alerts.
--
-- 1. equipment.strava_gear_id links a bike to a Strava bike, so webhook rides
--    are assigned automatically. Learned when a rider assigns a ride by hand,
--    or matched by bike name.
-- 2. strava_webhook_events: every event Strava pushes, stored first and then
--    processed (Strava expects a reply within 2 seconds and retries).
-- 3. Alerts: components.alert_level_sent remembers the last alert (80 = due
--    soon, 100 = replace now) so each threshold emails once per part;
--    app_users.wear_alerts_enabled lets riders opt out.

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

alter table components add column if not exists alert_level_sent int not null default 0;
alter table app_users add column if not exists wear_alerts_enabled boolean not null default true;

-- Parts already past a threshold when this ships shouldn't trigger a burst of
-- emails; start alerting from their next crossing.
update components set alert_level_sent = case
  when wear_percentage >= 100 then 100 when wear_percentage >= 80 then 80 else 0 end;

-- A replaced part starts a fresh alert cycle (same function as 016, plus that reset).
create or replace function public.components_set_wear_baseline()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_master master_components%rowtype;
  v_type text;
  v_baseline wear_baselines%rowtype;
begin
  if tg_op = 'UPDATE' and new.master_component_id is not distinct from old.master_component_id
     and new.name is not distinct from old.name then
    return new;
  end if;

  select * into v_master from master_components where id = new.master_component_id;
  new.wear_baseline_key := match_wear_baseline(coalesce(v_master.name, new.name), v_master.brand, v_master.series, v_master.model);

  select type into v_type from equipment where id = new.equipment_id;
  select * into v_baseline from wear_baselines where component_key = new.wear_baseline_key;
  -- Expected km on this bike's usual terrain (lifespan is road-equivalent).
  new.expected_replacement_km := case
    when v_baseline.basis <> 'distance' then null
    when bike_terrain(v_type) = 'offroad' then round(component_lifespan_km(new.master_component_id, new.wear_baseline_key)
                                                       * v_baseline.offroad_km / nullif(v_baseline.road_km, 0))
    else round(component_lifespan_km(new.master_component_id, new.wear_baseline_key)) end;

  -- A different part means a fresh wear clock.
  if tg_op = 'UPDATE' and new.master_component_id is distinct from old.master_component_id then
    new.wear_km := 0;
    new.wear_hours := 0;
    new.adjusted_km := 0;
    new.wear_percentage := 0;
    new.alert_level_sent := 0;
  end if;
  return new;
end;
$$;
