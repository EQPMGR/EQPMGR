-- Migration 013: make equipment.user_id the single owner column.
--
-- equipment carried both user_id and app_user_id (both referencing app_users.id,
-- which is the auth uid). RLS accepted either, and app code read one or the
-- other, which caused rows to "disappear". As of 2026-10-16 all rows had the two
-- columns equal. Apply this only after the app code that reads user_id is live.

-- Defensive backfill: if a row somehow has only app_user_id meaningful, keep it.
update equipment
set user_id = app_user_id
where app_user_id is not null and app_user_id <> user_id;

-- Recreate every policy that referenced app_user_id, using user_id only.

drop policy if exists equipment_select_own on equipment;
create policy equipment_select_own on equipment
  for select using (auth.uid()::uuid = user_id);

drop policy if exists equipment_insert_own on equipment;
create policy equipment_insert_own on equipment
  for insert with check (auth.uid()::uuid = user_id);

drop policy if exists equipment_update_own on equipment;
create policy equipment_update_own on equipment
  for update using (auth.uid()::uuid = user_id)
  with check (auth.uid()::uuid = user_id);

drop policy if exists equipment_delete_own on equipment;
create policy equipment_delete_own on equipment
  for delete using (auth.uid()::uuid = user_id);

drop policy if exists components_select_own on components;
create policy components_select_own on components
  for select using (exists (
    select 1 from equipment e
    where e.id = components.equipment_id and e.user_id = auth.uid()::uuid
  ));

drop policy if exists components_insert_own on components;
create policy components_insert_own on components
  for insert with check (exists (
    select 1 from equipment e
    where e.id = equipment_id and e.user_id = auth.uid()::uuid
  ));

drop policy if exists components_update_own on components;
create policy components_update_own on components
  for update using (exists (
    select 1 from equipment e
    where e.id = components.equipment_id and e.user_id = auth.uid()::uuid
  ))
  with check (exists (
    select 1 from equipment e
    where e.id = equipment_id and e.user_id = auth.uid()::uuid
  ));

drop policy if exists components_delete_own on components;
create policy components_delete_own on components
  for delete using (exists (
    select 1 from equipment e
    where e.id = components.equipment_id and e.user_id = auth.uid()::uuid
  ));

-- Created outside the migrations (dashboard); recreated here so the column can go.
drop policy if exists component_replacement_events_select_own on component_replacement_events;
create policy component_replacement_events_select_own on component_replacement_events
  for select using (exists (
    select 1 from equipment e
    where e.id = component_replacement_events.equipment_id and e.user_id = auth.uid()::uuid
  ));

alter table equipment drop column app_user_id;
