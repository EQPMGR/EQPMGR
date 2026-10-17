-- Migration 015: work orders that connect riders and shops, and one shared
-- "replace component" routine used by both apps.
--
-- 1. Shops can VIEW a customer's bike (and its components and replacement
--    history) once they have ever had a work order for it. Changing parts is
--    still only allowed while a work order is open; that check lives in the
--    shop app's server code before it calls replace_component().
-- 2. replace_component() does every step of a part replacement in one
--    transaction and records the data the manufacturer stats are built from
--    (component_replacement_events, component_failures -> lifespan stats).
--    Only the service role may call it; each app verifies the caller first.

-- ---------------------------------------------------------------------------
-- 1. Shop read access
-- ---------------------------------------------------------------------------

create index if not exists work_orders_provider_equipment_idx
  on work_orders (service_provider_auth_uid, equipment_id);

drop policy if exists equipment_select_shop on equipment;
create policy equipment_select_shop on equipment
  for select using (exists (
    select 1 from work_orders wo
    where wo.equipment_id = equipment.id
      and wo.service_provider_auth_uid = auth.uid()
  ));

drop policy if exists components_select_shop on components;
create policy components_select_shop on components
  for select using (exists (
    select 1 from work_orders wo
    where wo.equipment_id = components.equipment_id
      and wo.service_provider_auth_uid = auth.uid()
  ));

drop policy if exists component_replacement_events_select_shop on component_replacement_events;
create policy component_replacement_events_select_shop on component_replacement_events
  for select using (exists (
    select 1 from work_orders wo
    where wo.equipment_id = component_replacement_events.equipment_id
      and wo.service_provider_auth_uid = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 2. Shared replace routine
-- ---------------------------------------------------------------------------

create or replace function public.replace_component(
  p_equipment_id uuid,
  p_component_id uuid,
  p_reason text,                       -- 'failure' | 'upgrade' | 'modification'
  p_actor_id uuid,                     -- who is doing it (rider or shop user)
  p_new_master_component_id uuid default null,
  p_manual jsonb default null,         -- {brand, series, model, size} when not picked from the catalog
  p_shop_id text default null,         -- set when a shop does the replacement
  p_shop_name text default null,
  p_work_order_id uuid default null
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_equipment equipment%rowtype;
  v_component components%rowtype;
  v_old master_components%rowtype;
  v_new master_components%rowtype;
  v_interval numeric;
  v_now timestamptz := now();
  v_by_shop boolean := p_shop_id is not null;
  v_part text;
begin
  if p_reason not in ('failure', 'upgrade', 'modification') then
    raise exception 'Invalid replacement reason: %', p_reason;
  end if;

  select * into v_equipment from equipment where id = p_equipment_id for update;
  if not found then raise exception 'Equipment not found.'; end if;

  select * into v_component from components
  where id = p_component_id and equipment_id = p_equipment_id for update;
  if not found then raise exception 'Component not found on this bike.'; end if;

  select * into v_old from master_components where id = v_component.master_component_id;
  if not found then raise exception 'The part being replaced is missing from the catalog.'; end if;

  -- Work out the new catalog part: picked from the catalog, matched, or created.
  if p_new_master_component_id is not null then
    select * into v_new from master_components where id = p_new_master_component_id;
    if not found then raise exception 'Selected replacement part not found in the catalog.'; end if;
  elsif p_manual is not null and coalesce(p_manual->>'brand', '') <> '' then
    select * into v_new from master_components
    where brand is not distinct from nullif(p_manual->>'brand', '')
      and model is not distinct from nullif(p_manual->>'model', '')
      and series is not distinct from nullif(p_manual->>'series', '')
      and system is not distinct from v_old.system
    limit 1;
    if not found then
      insert into master_components (id, name, brand, series, model, size, system, slug, created_by)
      values (
        gen_random_uuid(), v_old.name,
        nullif(p_manual->>'brand', ''), nullif(p_manual->>'series', ''),
        nullif(p_manual->>'model', ''), nullif(p_manual->>'size', ''), v_old.system,
        trim(both '-' from regexp_replace(lower(concat_ws('-',
          v_old.name, p_manual->>'brand', p_manual->>'series', p_manual->>'model', p_manual->>'size')),
          '[^a-z0-9]+', '-', 'g')),
        p_actor_id)
      returning * into v_new;
    end if;
  else
    raise exception 'Choose a replacement part or enter its details.';
  end if;

  -- How far the old part went.
  if v_component.installed_at_distance is not null then
    v_interval := coalesce(v_component.current_distance, v_equipment.total_distance)
                  - v_component.installed_at_distance;
    if v_interval < 0 then v_interval := null; end if;
  end if;

  -- Rolling observed interval on the catalog part (failures only).
  if p_reason = 'failure' and v_interval > 0 then
    update master_components set
      observed_interval_km_avg = round(
        (coalesce(observed_interval_km_avg, 0) * coalesce(observed_interval_km_count, 0) + v_interval)
        / (coalesce(observed_interval_km_count, 0) + 1)),
      observed_interval_km_count = coalesce(observed_interval_km_count, 0) + 1
    where id = v_old.id;
  end if;

  -- Field data: one event per replacement, plus a failures row that feeds the
  -- lifespan stats trigger (which only counts failure / end_of_life).
  insert into component_replacement_events (
    equipment_id, equipment_component_id, master_component_id,
    actual_interval_km, replacement_reason, replaced_at_distance, notes)
  values (
    p_equipment_id, p_component_id, v_old.id,
    v_interval, p_reason, v_equipment.total_distance,
    case when v_by_shop then 'Replaced by ' || coalesce(p_shop_name, 'a shop') end);

  -- actual_distance_km is required; skip when the distance is unknown or zero
  -- (e.g. a bike with no rides synced) rather than skew the lifespan stats.
  if v_interval > 0 then
    insert into component_failures (
      component_id, user_id, equipment_id, actual_distance_km, equipment_type,
      replaced_at, replacement_type, component_brand, component_series, component_model,
      component_category, original_component_brand, original_component_model,
      replaced_with_brand, replaced_with_model, notes)
    values (
      v_old.id, v_equipment.user_id, p_equipment_id, v_interval, v_equipment.type,
      v_now, p_reason, v_old.brand, v_old.series, v_old.model,
      v_old.system, v_old.brand, v_old.model,
      v_new.brand, v_new.model,
      case when v_by_shop then 'Replaced by ' || coalesce(p_shop_name, 'a shop') end);
  end if;

  -- Swap the part on the bike and restart its wear clock.
  update components set
    master_component_id = v_new.id,
    name = coalesce(v_new.name, components.name),
    size = coalesce(v_new.size, components.size),
    wear_percentage = 0,
    purchase_date = v_now::date,
    last_service_date = null,
    installed_at = v_now,
    installed_at_distance = v_equipment.total_distance,
    current_distance = v_equipment.total_distance,
    replacement_count = coalesce(replacement_count, 0) + 1,
    replaced_by_user = not v_by_shop,
    notes = case when v_by_shop
                 then 'Replaced by ' || coalesce(p_shop_name, 'a shop') || ' on ' || to_char(v_now, 'YYYY-MM-DD')
                 else 'Replaced on ' || to_char(v_now, 'YYYY-MM-DD') end,
    updated_at = v_now
  where id = p_component_id;

  v_part := trim(concat_ws(' ', v_new.brand, v_new.series, v_new.model));

  -- Archive the old part and add a maintenance log entry (both apps read these).
  update equipment set
    archived_components = coalesce(archived_components, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'name', v_old.name, 'brand', v_old.brand, 'series', v_old.series, 'model', v_old.model,
      'system', v_old.system, 'size', coalesce(v_component.size, v_old.size),
      'wear_percentage', coalesce(v_component.wear_percentage, 0),
      'purchase_date', v_component.purchase_date, 'last_service_date', v_component.last_service_date,
      'replaced_on', v_now, 'final_mileage', coalesce(v_equipment.total_distance, 0),
      'interval_km', v_interval, 'replacement_reason', p_reason,
      'shop_id', p_shop_id, 'shop_name', p_shop_name)),
    maintenance_log = coalesce(maintenance_log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid(), 'date', v_now,
      'log_type', case when p_reason = 'failure' then 'repair' else 'modification' end,
      'description', 'Replaced ' || v_old.name || '.',
      'component_name', v_old.name,
      'cost', 0,
      'service_type', case when v_by_shop then 'shop' else 'diy' end,
      'shop_id', p_shop_id, 'shop_name', p_shop_name, 'work_order_id', p_work_order_id,
      'component_replaced', true,
      'is_oem', v_new.brand is not distinct from v_old.brand,
      'replacement_part', v_part,
      'notes', 'Original part was ' || trim(concat_ws(' ', v_old.brand, v_old.model)) || '. Reason: ' || p_reason || '.')),
    updated_at = v_now
  where id = p_equipment_id;

  return jsonb_build_object(
    'new_master_component_id', v_new.id,
    'replacement_part', v_part,
    'interval_km', v_interval);
end;
$$;

revoke all on function public.replace_component(uuid, uuid, text, uuid, uuid, jsonb, text, text, uuid) from public, anon, authenticated;
grant execute on function public.replace_component(uuid, uuid, text, uuid, uuid, jsonb, text, text, uuid) to service_role;
