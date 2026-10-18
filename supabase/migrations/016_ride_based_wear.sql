-- Migration 016: ride-based component wear.
--
-- Wear used to come from a hard-coded simulator that added at least 1% to every
-- part per ride. Now every ride (Strava or manual) is stored once in `rides`,
-- and apply_ride_wear() adds wear to each part on the bike:
--   distance parts: km x wet x e-bike x hill x rider-weight factors
--                   / lifespan (road or off-road) x 100
--   hour parts:     moving hours / service interval x 100   (suspension, droppers)
--   untracked:      frames, bars, stems, levers... (inspect, don't fake wear)
-- Lifespans live in `wear_baselines` (researched generic baselines, 2026-10-18).
-- They are a starting point; observed replacement data will refine them later.

-- ---------------------------------------------------------------------------
-- Baselines
-- ---------------------------------------------------------------------------

create table if not exists wear_baselines (
  component_key text primary key,
  label text not null,
  -- Case-insensitive regex tested against "name | brand | series | model".
  match_pattern text not null,
  priority int not null,                 -- lower is tested first
  basis text not null check (basis in ('distance', 'hours', 'none')),
  road_km numeric,
  offroad_km numeric,
  service_hours numeric,
  wet_factor numeric not null default 1,
  ebike_factor numeric not null default 1,
  -- Hills: 'drivetrain' parts wear with climbing torque, 'brakes' with descending.
  hill_group text not null default 'none' check (hill_group in ('drivetrain', 'brakes', 'none')),
  -- Rider weight effect: factor = (total mass / 87 kg reference) ^ exponent.
  -- 1 = full (brakes: braking energy is proportional to mass), 0.5 = partial, 0 = none.
  weight_exponent numeric not null default 0,
  confidence text check (confidence in ('high', 'medium', 'low')),
  notes text,
  updated_at timestamptz not null default now()
);

alter table wear_baselines enable row level security;
drop policy if exists wear_baselines_select_all on wear_baselines;
create policy wear_baselines_select_all on wear_baselines for select using (true);

insert into wear_baselines
  (component_key, label, match_pattern, priority, basis, road_km, offroad_km, service_hours, wet_factor, ebike_factor, confidence, notes)
values
  -- Hour-based (suspension). Brand/model tells a suspension fork from a rigid one.
  ('suspension_fork', 'Suspension fork (full service)', '^[^|]*fork.*(fox|rockshox|rock shox|marzocchi|suntour|manitou|dt swiss|ohlins|öhlins|cane creek|formula|mrp|dvo|x-fusion|intend)', 10, 'hours', null, null, 125, 1, 1, 'high', 'Fox 125 h or yearly; RockShox 100-200 h. Lowers service every 50 h.'),
  ('rear_shock', 'Rear shock (full service)', '^[^|]*(rear shock|shock)', 20, 'hours', null, null, 125, 1, 1, 'medium', 'Air can service every 50 h.'),
  ('dropper_post', 'Dropper post (service)', '^[^|]*dropper|^[^|]*seatpost(?! ?clamp).*(reverb|transfer|oneup|bikeyoke|9point8|pnw|\mlev\M|vyron|dropper)', 30, 'hours', null, null, 200, 1, 1, 'high', 'RockShox Reverb 200 h; internals 400-600 h.'),
  -- Drivetrain (chainring before chain so "Chainring" doesn't match "chain").
  ('chainring', 'Chainring', '^[^|]*chain ?ring', 100, 'distance', 20000, 10000, null, 1.5, 1.5, 'medium', 'About 2 cassettes per ring.'),
  ('chain', 'Chain', '^[^|]*\mchain\M', 110, 'distance', 4000, 2000, null, 1.5, 1.5, 'high', 'Replace at 0.5% (11-12 speed) or 0.75% (10 speed and under).'),
  ('cassette', 'Cassette', '^[^|]*(cassette|freewheel)', 120, 'distance', 12000, 6000, null, 1.5, 1.5, 'medium', 'About 3 chains per cassette.'),
  ('jockey_wheels', 'Jockey wheels', '^[^|]*(jockey|pulley)', 130, 'distance', 10000, 5000, null, 1.5, 1, 'low', null),
  ('derailleur', 'Derailleur', '^[^|]*derailleur', 140, 'distance', 30000, 15000, null, 1, 1, 'low', 'Usually replaced after crashes rather than wear.'),
  ('shifter', 'Shifter', '^[^|]*(shifter|shift lever)', 150, 'distance', 40000, 25000, null, 1, 1, 'low', null),
  ('cables', 'Cables and housing', '^[^|]*(cable|housing)', 160, 'distance', 6000, 3000, null, 1.5, 1, 'low', 'Or yearly.'),
  ('bottom_bracket', 'Bottom bracket', '^[^|]*bottom bracket', 170, 'distance', 10000, 5000, null, 1.5, 1, 'medium', null),
  ('crankset', 'Crankset', '^[^|]*crank', 180, 'distance', 50000, 30000, null, 1, 1, 'low', 'Inspect rather than replace.'),
  -- Brakes. "Front Brake" / "Rear Brake" components carry the pads.
  ('rotor', 'Disc rotor', '^[^|]*rotor', 200, 'distance', 20000, 10000, null, 1.5, 1, 'medium', 'Replace at minimum thickness (Shimano 1.5 mm, SRAM 1.55 mm).'),
  ('brake_untracked', 'Brake lever / caliper', '^[^|]*(brake lever|lever|caliper)', 210, 'none', null, null, null, 1, 1, null, 'Bleed hydraulic brakes yearly.'),
  ('brake_pads', 'Brake pads', '^[^|]*(brake pad|\mpads?\M|^(front |rear )?brakes?\M)', 220, 'distance', 4000, 2000, null, 1.5, 1, 'medium', 'Disc pads. Sintered last ~1.5x longer; rim pads ~2,000 km road.'),
  -- Wheels and tires.
  ('rear_tire', 'Rear tire', '^[^|]*rear (tire|tyre)', 300, 'distance', 5000, 2500, null, 1, 1, 'medium', 'Rear wears 1.5-2x faster than front. 10-year age limit.'),
  ('tire', 'Tire', '^[^|]*(tire|tyre)', 310, 'distance', 8000, 4000, null, 1, 1, 'medium', '10-year age limit.'),
  ('hub', 'Hub bearings (service)', '^[^|]*\mhub', 320, 'distance', 10000, 5000, null, 1.5, 1, 'low', null),
  ('rim', 'Rim', '^[^|]*\mrims?\M', 330, 'none', null, null, null, 1, 1, null, 'Disc-brake rims are not a wear item; rim-brake rims ~20,000 km road (use the wear groove).'),
  -- Frameset / cockpit / contact points.
  ('headset', 'Headset (service)', '^[^|]*headset', 400, 'distance', 15000, 8000, null, 1.5, 1, 'low', 'Or every 2-3 years; yearly in wet climates.'),
  ('pedals', 'Pedal bearings (service)', '^[^|]*pedal', 410, 'distance', 10000, 5000, null, 1.5, 1, 'low', null),
  ('bar_tape_grips', 'Bar tape / grips', '^[^|]*(bar tape|grip)', 420, 'distance', 5000, 5000, null, 1, 1, 'low', null),
  ('saddle', 'Saddle', '^[^|]*saddle', 430, 'distance', 20000, 20000, null, 1, 1, 'low', null),
  ('structural', 'Structural (inspect yearly and after crashes)', '^[^|]*(frame|fork|handlebar|stem|seatpost|aero bar|clamp|skewer|axle|valve)', 900, 'none', null, null, null, 1, 1, null, 'Not a wear item.')
on conflict (component_key) do update set
  label = excluded.label, match_pattern = excluded.match_pattern, priority = excluded.priority,
  basis = excluded.basis, road_km = excluded.road_km, offroad_km = excluded.offroad_km,
  service_hours = excluded.service_hours, wet_factor = excluded.wet_factor,
  ebike_factor = excluded.ebike_factor, confidence = excluded.confidence,
  notes = excluded.notes, updated_at = now();

-- Hill and rider-weight sensitivity (reasoned estimates, not published data;
-- to be refined with observed replacement data).
update wear_baselines set hill_group = 'drivetrain', weight_exponent = 0.5
  where component_key in ('chain', 'cassette', 'chainring', 'jockey_wheels', 'bottom_bracket');
update wear_baselines set hill_group = 'brakes', weight_exponent = 1
  where component_key in ('brake_pads', 'rotor');
update wear_baselines set weight_exponent = 0.5
  where component_key in ('rear_tire', 'tire', 'hub', 'headset', 'pedals');

-- Climbing in metres per km -> multiplier for the part's hill group.
create or replace function public.hill_factor(p_hill_group text, p_elevation_gain_m numeric, p_distance_km numeric)
returns numeric language sql immutable as $$
  select case
    when p_hill_group = 'none' or coalesce(p_elevation_gain_m, 0) <= 0 or coalesce(p_distance_km, 0) <= 0 then 1
    else case
      when p_elevation_gain_m / p_distance_km < 5 then 1
      when p_elevation_gain_m / p_distance_km < 15 then case p_hill_group when 'brakes' then 1.25 else 1.15 end
      when p_elevation_gain_m / p_distance_km < 30 then case p_hill_group when 'brakes' then 1.5 else 1.3 end
      else case p_hill_group when 'brakes' then 2.0 else 1.5 end
    end
  end::numeric;
$$;

-- Rider + bike mass relative to a 75 kg rider on a 12 kg bike, capped 0.8-1.5.
create or replace function public.weight_factor(p_exponent numeric, p_rider_kg numeric, p_is_ebike boolean)
returns numeric language sql immutable as $$
  select case
    when coalesce(p_exponent, 0) = 0 or p_rider_kg is null or p_rider_kg <= 0 then 1
    else power(least(greatest((p_rider_kg + case when p_is_ebike then 23 else 12 end) / 87.0, 0.8), 1.5), p_exponent)
  end::numeric;
$$;

create or replace function public.match_wear_baseline(p_name text, p_brand text, p_series text, p_model text)
returns text
language sql stable
set search_path = public
as $$
  select component_key from wear_baselines
  where concat_ws(' | ', coalesce(p_name, ''), coalesce(p_brand, ''), coalesce(p_series, ''), coalesce(p_model, ''))
        ~* match_pattern
  order by priority
  limit 1;
$$;

-- Off-road wear for MTB, gravel and cyclocross bikes; e-bike factor for e-bikes.
create or replace function public.bike_terrain(p_equipment_type text)
returns text language sql immutable as $$
  select case when p_equipment_type ~* '(gravel|cyclocross|cross country|mountain|enduro|downhill|dirt|all mountain)'
              then 'offroad' else 'road' end;
$$;

-- ---------------------------------------------------------------------------
-- Components: resolved baseline + raw usage since install
-- ---------------------------------------------------------------------------

alter table components add column if not exists wear_baseline_key text references wear_baselines(component_key);
alter table components add column if not exists wear_km numeric not null default 0;
alter table components add column if not exists wear_hours numeric not null default 0;

-- Keep the baseline (and expected lifespan) in sync whenever a part is added or swapped.
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
  new.expected_replacement_km := case
    when v_baseline.basis = 'distance' and bike_terrain(v_type) = 'offroad' then v_baseline.offroad_km
    when v_baseline.basis = 'distance' then v_baseline.road_km
    else null end;

  -- A different part means a fresh wear clock.
  if tg_op = 'UPDATE' and new.master_component_id is distinct from old.master_component_id then
    new.wear_km := 0;
    new.wear_hours := 0;
    new.wear_percentage := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists components_set_wear_baseline on components;
create trigger components_set_wear_baseline
  before insert or update of master_component_id, name on components
  for each row execute function components_set_wear_baseline();

-- ---------------------------------------------------------------------------
-- Rides
-- ---------------------------------------------------------------------------

create table if not exists rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  equipment_id uuid not null references equipment(id) on delete cascade,
  source text not null check (source in ('strava', 'manual')),
  external_id text,                     -- Strava activity id
  name text,
  started_at timestamptz not null,
  distance_km numeric not null check (distance_km >= 0),
  moving_hours numeric not null default 0 check (moving_hours >= 0),
  elevation_gain_m numeric check (elevation_gain_m >= 0),
  rider_weight_kg numeric,               -- snapshot from the rider's profile
  sport_type text,
  terrain text not null check (terrain in ('road', 'offroad')),
  is_ebike boolean not null default false,
  lat numeric,
  lng numeric,
  weather_status text not null default 'unknown' check (weather_status in ('wet', 'dry', 'unknown')),
  weather_source text,                  -- 'weatherapi' | 'rider' (marked by hand)
  weather_summary text,
  precip_during_mm numeric,
  precip_before_mm numeric,
  wear_applied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists rides_equipment_idx on rides (equipment_id, started_at desc);
create index if not exists rides_user_idx on rides (user_id, started_at desc);

alter table rides enable row level security;
drop policy if exists rides_select_own on rides;
create policy rides_select_own on rides for select using (auth.uid() = user_id);
-- Writes go through the apps' server code (service role) only.

-- ---------------------------------------------------------------------------
-- Apply one ride's wear (idempotent)
-- ---------------------------------------------------------------------------

create or replace function public.apply_ride_wear(p_ride_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_ride rides%rowtype;
  v_parts int := 0;
begin
  select * into v_ride from rides where id = p_ride_id for update;
  if not found then raise exception 'Ride not found.'; end if;
  if v_ride.wear_applied_at is not null then
    return jsonb_build_object('already_applied', true);
  end if;

  update equipment set
    total_distance = coalesce(total_distance, 0) + v_ride.distance_km,
    total_hours = coalesce(total_hours, 0) + v_ride.moving_hours,
    updated_at = now()
  where id = v_ride.equipment_id;

  with w as (
    select c.id,
      case
        when b.basis = 'distance' then
          v_ride.distance_km
          * case when v_ride.weather_status = 'wet' then b.wet_factor else 1 end
          * case when v_ride.is_ebike then b.ebike_factor else 1 end
          * hill_factor(b.hill_group, v_ride.elevation_gain_m, v_ride.distance_km)
          * weight_factor(b.weight_exponent, v_ride.rider_weight_kg, v_ride.is_ebike)
          / nullif(case when v_ride.terrain = 'offroad' then b.offroad_km else b.road_km end, 0) * 100
        when b.basis = 'hours' then v_ride.moving_hours / nullif(b.service_hours, 0) * 100
        else 0
      end as delta
    from components c
    left join wear_baselines b on b.component_key = c.wear_baseline_key
    where c.equipment_id = v_ride.equipment_id
      and coalesce(c.is_active, true)
  )
  update components c set
    wear_km = c.wear_km + v_ride.distance_km,
    wear_hours = c.wear_hours + v_ride.moving_hours,
    wear_percentage = round((coalesce(c.wear_percentage, 0) + coalesce(w.delta, 0))::numeric, 2),
    current_distance = coalesce(c.current_distance, 0) + v_ride.distance_km,
    updated_at = now()
  from w where w.id = c.id;
  get diagnostics v_parts = row_count;

  update rides set wear_applied_at = now() where id = p_ride_id;

  return jsonb_build_object('parts_updated', v_parts, 'weather', v_ride.weather_status);
end;
$$;

revoke all on function public.apply_ride_wear(uuid) from public, anon, authenticated;
grant execute on function public.apply_ride_wear(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Backfill existing parts
-- ---------------------------------------------------------------------------
-- Resolve baselines, then replace the old simulator's wear with an estimate
-- from distance on the bike since install (assumed dry; no per-ride history).

-- (left join: some older parts have no catalog link; match on their own name)
update components c set
  wear_baseline_key = x.key
from (
  select c2.id, match_wear_baseline(coalesce(m.name, c2.name), m.brand, m.series, m.model) as key
  from components c2
  left join master_components m on m.id = c2.master_component_id
) x
where x.id = c.id;

update components c set
  wear_km = greatest(coalesce(e.total_distance, 0) - coalesce(c.installed_at_distance, 0), 0),
  wear_hours = 0,
  expected_replacement_km = case
    when b.basis = 'distance' and bike_terrain(e.type) = 'offroad' then b.offroad_km
    when b.basis = 'distance' then b.road_km end,
  wear_percentage = case
    when b.basis = 'distance' then round((greatest(coalesce(e.total_distance, 0) - coalesce(c.installed_at_distance, 0), 0)
      / nullif(case when bike_terrain(e.type) = 'offroad' then b.offroad_km else b.road_km end, 0) * 100)::numeric, 2)
    else 0 end
from equipment e, wear_baselines b
where e.id = c.equipment_id and b.component_key = c.wear_baseline_key;

update components set wear_percentage = 0, expected_replacement_km = null
where wear_baseline_key is null;
