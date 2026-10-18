-- Migration 017: learn real lifespans from replacements and measurements.
--
-- 1. component_measurements: measured chain stretch (riders and shops). The
--    latest measurement on a part beats the model's wear estimate.
-- 2. Replacement events record everything needed to learn from them:
--    road-equivalent adjusted km, part identity, install time, final stretch.
-- 3. component_lifespan_km() now blends observed lifespans into the baseline:
--      estimate = (n x observed mean + K x prior) / (n + K)
--    applied level by level: part type -> brand -> series -> exact model.
--    With no data it equals the baseline; real data takes over gradually.
--    Each new replacement re-judges the wear of every part of that type.
-- 4. Report views for field data (service role only).

-- ---------------------------------------------------------------------------
-- 1. Measurements
-- ---------------------------------------------------------------------------

create table if not exists component_measurements (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references components(id) on delete cascade,
  equipment_id uuid not null references equipment(id) on delete cascade,
  kind text not null check (kind in ('chain_stretch')),
  value numeric not null check (value >= 0 and value <= 5),   -- percent elongation
  threshold numeric not null default 0.5 check (threshold > 0),  -- replace-at percent (0.5 for 11-12 speed, 0.75 for <=10)
  measured_at timestamptz not null default now(),
  measured_by uuid,                        -- auth user (rider or shop)
  measured_by_role text not null check (measured_by_role in ('rider', 'shop')),
  shop_name text,
  work_order_id uuid,
  wear_km_at numeric,                      -- raw km on the part at measurement
  adjusted_km_at numeric,                  -- adjusted km on the part at measurement
  predicted_wear_pct numeric,              -- what the model said just before
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists component_measurements_component_idx on component_measurements (component_id, measured_at desc);

alter table component_measurements enable row level security;
drop policy if exists component_measurements_select_own on component_measurements;
create policy component_measurements_select_own on component_measurements
  for select using (exists (
    select 1 from equipment e where e.id = component_measurements.equipment_id and e.user_id = auth.uid()));
drop policy if exists component_measurements_select_shop on component_measurements;
create policy component_measurements_select_shop on component_measurements
  for select using (exists (
    select 1 from work_orders wo
    where wo.equipment_id = component_measurements.equipment_id and wo.service_provider_auth_uid = auth.uid()));
-- Writes go through the apps' server code (service role) only.

-- Fill the "at the time" snapshot fields.
create or replace function public.component_measurements_snapshot()
returns trigger language plpgsql set search_path = public as $$
begin
  select c.wear_km, c.adjusted_km, c.wear_percentage, c.equipment_id
    into new.wear_km_at, new.adjusted_km_at, new.predicted_wear_pct, new.equipment_id
  from components c where c.id = new.component_id;
  return new;
end;
$$;

drop trigger if exists component_measurements_snapshot on component_measurements;
create trigger component_measurements_snapshot
  before insert on component_measurements
  for each row execute function component_measurements_snapshot();

-- ---------------------------------------------------------------------------
-- 2. Richer replacement events
-- ---------------------------------------------------------------------------

alter table component_replacement_events add column if not exists baseline_key text;
alter table component_replacement_events add column if not exists brand text;
alter table component_replacement_events add column if not exists series text;
alter table component_replacement_events add column if not exists model text;
alter table component_replacement_events add column if not exists raw_km numeric;
alter table component_replacement_events add column if not exists adjusted_km numeric;
alter table component_replacement_events add column if not exists part_installed_at timestamptz;
alter table component_replacement_events add column if not exists final_stretch_pct numeric;
alter table component_replacement_events add column if not exists final_stretch_threshold numeric;

create index if not exists cre_baseline_idx on component_replacement_events (baseline_key, replacement_reason);
create index if not exists cre_master_idx on component_replacement_events (master_component_id);
create index if not exists cre_equipment_idx on component_replacement_events (equipment_id, created_at);

-- replace_component() inserts the event before swapping the part, so the
-- outgoing part's usage and identity are still on the components row.
create or replace function public.component_replacement_events_snapshot()
returns trigger language plpgsql set search_path = public as $$
declare
  v_c components%rowtype;
  v_m master_components%rowtype;
begin
  select * into v_c from components where id = new.equipment_component_id;
  select * into v_m from master_components where id = coalesce(new.master_component_id, v_c.master_component_id);
  new.baseline_key := coalesce(new.baseline_key, v_c.wear_baseline_key);
  new.brand := coalesce(new.brand, v_m.brand);
  new.series := coalesce(new.series, v_m.series);
  new.model := coalesce(new.model, v_m.model);
  new.raw_km := coalesce(new.raw_km, v_c.wear_km);
  new.adjusted_km := coalesce(new.adjusted_km, v_c.adjusted_km);
  new.part_installed_at := coalesce(new.part_installed_at, v_c.installed_at, v_c.created_at);
  if new.final_stretch_pct is null then
    select m.value, m.threshold into new.final_stretch_pct, new.final_stretch_threshold
    from component_measurements m
    where m.component_id = new.equipment_component_id
      and m.kind = 'chain_stretch'
      and m.measured_at >= coalesce(v_c.installed_at, '-infinity'::timestamptz)
    order by m.measured_at desc limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists component_replacement_events_snapshot on component_replacement_events;
create trigger component_replacement_events_snapshot
  before insert on component_replacement_events
  for each row execute function component_replacement_events_snapshot();

-- ---------------------------------------------------------------------------
-- 3. Blended lifespans
-- ---------------------------------------------------------------------------

-- Observations: worn-out/failed parts only (upgrades and mods don't count),
-- clamped to 0.25x-4x of the baseline so a bad entry can't swing the result.
create or replace view lifespan_observations as
select
  e.id, e.baseline_key, e.master_component_id, e.brand, e.series, e.model,
  least(greatest(e.adjusted_km, b.road_km * 0.25), b.road_km * 4) as adjusted_km,
  e.created_at
from component_replacement_events e
join wear_baselines b on b.component_key = e.baseline_key and b.basis = 'distance'
where e.replacement_reason = 'failure'
  and e.adjusted_km > 0;

create or replace function public.lifespan_estimate(p_master_component_id uuid, p_baseline_key text)
returns table (
  lifespan_km numeric, baseline_km numeric,
  n_model int, n_series int, n_brand int, n_type int,
  confidence text, basis_level text
)
-- security definer: reads the service-only observations; execute is restricted below.
language plpgsql stable security definer set search_path = public as $$
declare
  k constant numeric := 8;   -- the baseline counts as 8 observations
  v_base numeric;
  v_brand text; v_series text;
  t_n int; t_mean numeric; b_n int; b_mean numeric; s_n int; s_mean numeric; m_n int; m_mean numeric;
  v_est numeric;
begin
  select road_km into v_base from wear_baselines where component_key = p_baseline_key and basis = 'distance';
  if v_base is null then return; end if;
  select brand, series into v_brand, v_series from master_components where id = p_master_component_id;

  -- Each observation counts once, at its most specific matching level, so the
  -- same replacement doesn't nudge the estimate at every level.
  select count(*), avg(o.adjusted_km) into m_n, m_mean from lifespan_observations o
    where p_master_component_id is not null and o.master_component_id = p_master_component_id;
  select count(*), avg(o.adjusted_km) into s_n, s_mean from lifespan_observations o
    where o.baseline_key = p_baseline_key and v_brand is not null and v_series is not null
      and lower(o.brand) = lower(v_brand) and lower(o.series) = lower(v_series)
      and o.master_component_id is distinct from p_master_component_id;
  select count(*), avg(o.adjusted_km) into b_n, b_mean from lifespan_observations o
    where o.baseline_key = p_baseline_key and v_brand is not null and lower(o.brand) = lower(v_brand)
      and (v_series is null or lower(coalesce(o.series, '')) <> lower(v_series))
      and o.master_component_id is distinct from p_master_component_id;
  select count(*), avg(o.adjusted_km) into t_n, t_mean from lifespan_observations o
    where o.baseline_key = p_baseline_key
      and (v_brand is null or lower(coalesce(o.brand, '')) <> lower(v_brand))
      and o.master_component_id is distinct from p_master_component_id;

  v_est := v_base;
  if t_n > 0 then v_est := (t_n * t_mean + k * v_est) / (t_n + k); end if;
  if b_n > 0 then v_est := (b_n * b_mean + k * v_est) / (b_n + k); end if;
  if s_n > 0 then v_est := (s_n * s_mean + k * v_est) / (s_n + k); end if;
  if m_n > 0 then v_est := (m_n * m_mean + k * v_est) / (m_n + k); end if;

  lifespan_km := round(v_est);
  baseline_km := v_base;
  n_model := m_n; n_series := s_n; n_brand := b_n; n_type := t_n;
  confidence := case when m_n >= 50 then 'high' when m_n >= 10 then 'medium'
                     when m_n + s_n + b_n + t_n > 0 then 'low' else 'baseline' end;
  basis_level := case when m_n > 0 then 'model' when s_n > 0 then 'series'
                      when b_n > 0 then 'brand' when t_n > 0 then 'type' else 'baseline' end;
  return next;
end;
$$;

-- security definer so wear triggers work for rider/shop edits; returns only the
-- single expected-life number riders already see on their own parts.
create or replace function public.component_lifespan_km(p_master_component_id uuid, p_baseline_key text)
returns numeric language sql stable security definer set search_path = public as $$
  select lifespan_km from lifespan_estimate(p_master_component_id, p_baseline_key);
$$;

-- Wear: a chain-stretch measurement (since the part was installed) is the
-- truth at that moment; model wear is added on top for km ridden since.
create or replace function public.component_wear_pct(p_component_id uuid)
returns numeric language plpgsql stable set search_path = public as $$
declare
  v_c components%rowtype;
  v_b wear_baselines%rowtype;
  v_life numeric;
  v_m component_measurements%rowtype;
begin
  select * into v_c from components where id = p_component_id;
  select * into v_b from wear_baselines where component_key = v_c.wear_baseline_key;
  if v_b.basis = 'hours' then
    return round(coalesce(v_c.wear_hours / nullif(v_b.service_hours, 0) * 100, 0)::numeric, 2);
  elsif v_b.basis is distinct from 'distance' then
    return 0;
  end if;

  v_life := component_lifespan_km(v_c.master_component_id, v_c.wear_baseline_key);

  select * into v_m from component_measurements
  where component_id = p_component_id and kind = 'chain_stretch'
    and measured_at >= coalesce(v_c.installed_at, '-infinity'::timestamptz)
  order by measured_at desc limit 1;

  if found then
    return round((v_m.value / v_m.threshold * 100
      + greatest(v_c.adjusted_km - coalesce(v_m.adjusted_km_at, v_c.adjusted_km), 0) / nullif(v_life, 0) * 100)::numeric, 2);
  end if;
  return round(coalesce(v_c.adjusted_km / nullif(v_life, 0) * 100, 0)::numeric, 2);
end;
$$;

-- Re-judge every part of a type when its lifespan estimate moves.
create or replace function public.refresh_wear_for_baseline(p_baseline_key text)
returns int language plpgsql set search_path = public as $$
declare v_n int;
begin
  update components c set
    wear_percentage = component_wear_pct(c.id),
    expected_replacement_km = case
      when bike_terrain(e.type) = 'offroad' then round(component_lifespan_km(c.master_component_id, c.wear_baseline_key)
                                                      * b.offroad_km / nullif(b.road_km, 0))
      else component_lifespan_km(c.master_component_id, c.wear_baseline_key) end
  from equipment e, wear_baselines b
  where e.id = c.equipment_id and b.component_key = c.wear_baseline_key
    and b.basis = 'distance' and c.wear_baseline_key = p_baseline_key
    and coalesce(c.is_active, true);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

create or replace function public.component_replacement_events_learn()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.replacement_reason = 'failure' and new.baseline_key is not null then
    perform refresh_wear_for_baseline(new.baseline_key);
  end if;
  return null;
end;
$$;

drop trigger if exists component_replacement_events_learn on component_replacement_events;
create trigger component_replacement_events_learn
  after insert on component_replacement_events
  for each row execute function component_replacement_events_learn();

-- A new measurement changes that part's wear right away.
create or replace function public.component_measurements_apply()
returns trigger language plpgsql set search_path = public as $$
begin
  update components set wear_percentage = component_wear_pct(id), updated_at = now() where id = new.component_id;
  return null;
end;
$$;

drop trigger if exists component_measurements_apply on component_measurements;
create trigger component_measurements_apply
  after insert on component_measurements
  for each row execute function component_measurements_apply();

-- ---------------------------------------------------------------------------
-- 4. Reports (manufacturer field data; service role only)
-- ---------------------------------------------------------------------------

-- Current lifespan estimate for every catalog part that has a distance baseline.
create or replace view report_part_lifespans as
select m.id as master_component_id, m.brand, m.series, m.model, m.name, b.component_key as baseline_key,
       est.lifespan_km, est.baseline_km, est.n_model, est.n_series, est.n_brand, est.n_type,
       est.confidence, est.basis_level
from master_components m
join wear_baselines b on b.component_key = match_wear_baseline(m.name, m.brand, m.series, m.model)
cross join lateral lifespan_estimate(m.id, b.component_key) est
where b.basis = 'distance';

-- How chain stretch affects cassette / chainring / jockey wheel life: for each
-- worn-out part, the worst final stretch of the chains replaced on the same
-- bike while it was installed.
create or replace view report_drivetrain_vs_chain_stretch as
with parts as (
  select e.id, e.baseline_key, e.equipment_id, e.adjusted_km, e.part_installed_at, e.created_at as replaced_at
  from component_replacement_events e
  where e.replacement_reason = 'failure'
    and e.baseline_key in ('cassette', 'chainring', 'jockey_wheels')
    and e.adjusted_km > 0
),
worst as (
  select p.id,
         max(c.final_stretch_pct / nullif(c.final_stretch_threshold, 0)) as worst_ratio,
         count(c.id) as chains_used
  from parts p
  left join component_replacement_events c
    on c.equipment_id = p.equipment_id and c.baseline_key = 'chain'
   and c.created_at > p.part_installed_at and c.created_at <= p.replaced_at
  group by p.id
)
select p.baseline_key as part_type,
       case when w.worst_ratio is null then 'unknown (no stretch recorded)'
            when w.worst_ratio <= 1.0 then 'chains replaced on time (at or under limit)'
            when w.worst_ratio <= 1.5 then 'chains run up to 1.5x the limit'
            else 'chains run past 1.5x the limit' end as chain_care,
       count(*) as parts,
       round(avg(p.adjusted_km)) as avg_adjusted_km,
       round(avg(w.chains_used), 1) as avg_chains_per_part
from parts p join worst w on w.id = p.id
group by 1, 2;

-- How well the model predicts measured stretch (calibration).
create or replace view report_stretch_vs_prediction as
select date_trunc('month', measured_at) as month, measured_by_role,
       count(*) as measurements,
       round(avg(value / threshold * 100), 1) as avg_measured_wear_pct,
       round(avg(predicted_wear_pct), 1) as avg_predicted_wear_pct
from component_measurements
where kind = 'chain_stretch'
group by 1, 2;

revoke all on lifespan_observations, report_part_lifespans, report_drivetrain_vs_chain_stretch, report_stretch_vs_prediction
  from anon, authenticated;
revoke all on function public.lifespan_estimate(uuid, text) from public, anon, authenticated;
grant execute on function public.lifespan_estimate(uuid, text) to service_role;
revoke all on function public.refresh_wear_for_baseline(text) from public, anon, authenticated;
