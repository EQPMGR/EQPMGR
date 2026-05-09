-- Migration 008: Enable and enforce Row Level Security on app tables

-- Enable RLS for all relevant application tables
alter table if exists app_users enable row level security;
alter table if exists equipment enable row level security;
alter table if exists components enable row level security;
alter table if exists bike_models enable row level security;
alter table if exists master_components enable row level security;
alter table if exists bike_model_components enable row level security;
alter table if exists component_replacement_events enable row level security;
alter table if exists ignored_duplicates enable row level security;
alter table if exists service_providers enable row level security;
alter table if exists work_orders enable row level security;

-- app_users policies
drop policy if exists app_users_select_own on app_users;
create policy app_users_select_own on app_users
  for select using (auth.uid()::uuid = id);
drop policy if exists app_users_insert_own on app_users;
create policy app_users_insert_own on app_users
  for insert with check (auth.uid()::uuid = id);
drop policy if exists app_users_update_own on app_users;
create policy app_users_update_own on app_users
  for update using (auth.uid()::uuid = id)
  with check (auth.uid()::uuid = id);

-- equipment policies
drop policy if exists equipment_select_own on equipment;
create policy equipment_select_own on equipment
  for select using (auth.uid()::uuid = user_id or auth.uid()::uuid = app_user_id);
drop policy if exists equipment_insert_own on equipment;
create policy equipment_insert_own on equipment
  for insert with check (auth.uid()::uuid = user_id or auth.uid()::uuid = app_user_id);
drop policy if exists equipment_update_own on equipment;
create policy equipment_update_own on equipment
  for update using (auth.uid()::uuid = user_id or auth.uid()::uuid = app_user_id)
  with check (auth.uid()::uuid = user_id or auth.uid()::uuid = app_user_id);

-- components policies
drop policy if exists components_select_own on components;
create policy components_select_own on components
  for select using (exists (
    select 1 from equipment e
    where e.id = components.equipment_id
      and (e.user_id = auth.uid()::uuid or e.app_user_id = auth.uid()::uuid)
  ));
drop policy if exists components_insert_own on components;
create policy components_insert_own on components
  for insert with check (exists (
    select 1 from equipment e
    where e.id = equipment_id
      and (e.user_id = auth.uid()::uuid or e.app_user_id = auth.uid()::uuid)
  ));
drop policy if exists components_update_own on components;
create policy components_update_own on components
  for update using (exists (
    select 1 from equipment e
    where e.id = components.equipment_id
      and (e.user_id = auth.uid()::uuid or e.app_user_id = auth.uid()::uuid)
  ))
  with check (exists (
    select 1 from equipment e
    where e.id = equipment_id
      and (e.user_id = auth.uid()::uuid or e.app_user_id = auth.uid()::uuid)
  ));

-- bike_models policies
drop policy if exists bike_models_select_all on bike_models;
create policy bike_models_select_all on bike_models
  for select using (true);
drop policy if exists bike_models_insert on bike_models;
create policy bike_models_insert on bike_models
  for insert with check (auth.uid()::uuid is not null);
drop policy if exists bike_models_update on bike_models;
create policy bike_models_update on bike_models
  for update using (auth.uid()::uuid = created_by)
  with check (auth.uid()::uuid = created_by);

-- master_components policies
drop policy if exists master_components_select_all on master_components;
create policy master_components_select_all on master_components
  for select using (true);
drop policy if exists master_components_no_client_writes on master_components;
create policy master_components_no_client_writes on master_components
  for all using (false)
  with check (false);

-- bike_model_components policies
drop policy if exists bike_model_components_select_all on bike_model_components;
create policy bike_model_components_select_all on bike_model_components
  for select using (true);
drop policy if exists bike_model_components_no_client_writes on bike_model_components;
create policy bike_model_components_no_client_writes on bike_model_components
  for all using (false)
  with check (false);

-- component_replacement_events policies
drop policy if exists component_replacement_events_select_own on component_replacement_events;
create policy component_replacement_events_select_own on component_replacement_events
  for select using (exists (
    select 1 from equipment e
    where e.id = component_replacement_events.equipment_id
      and (e.user_id = auth.uid()::uuid or e.app_user_id = auth.uid()::uuid)
  ));
drop policy if exists component_replacement_events_no_client_writes on component_replacement_events;
create policy component_replacement_events_no_client_writes on component_replacement_events
  for all using (false)
  with check (false);

-- ignored_duplicates policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'ignored_duplicates'
  ) THEN
    EXECUTE 'drop policy if exists ignored_duplicates_no_client_access on ignored_duplicates;';
    EXECUTE 'create policy ignored_duplicates_no_client_access on ignored_duplicates for all using (false) with check (false);';
  END IF;
END
$$;

-- service_providers policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'service_providers'
  ) THEN
    EXECUTE 'drop policy if exists service_providers_select_all on service_providers;';
    EXECUTE 'create policy service_providers_select_all on service_providers for select using (true);';
    EXECUTE 'drop policy if exists service_providers_no_client_writes on service_providers;';
    EXECUTE 'create policy service_providers_no_client_writes on service_providers for all using (false) with check (false);';
  END IF;
END
$$;

-- work_orders policies
drop policy if exists work_orders_participant_access on work_orders;
create policy work_orders_participant_access on work_orders
  for select using (
    user_id = auth.uid()::uuid
    or service_provider_auth_uid = auth.uid()::uuid
  );
drop policy if exists work_orders_participant_insert on work_orders;
create policy work_orders_participant_insert on work_orders
  for insert with check (
    user_id = auth.uid()::uuid
    or service_provider_auth_uid = auth.uid()::uuid
  );
drop policy if exists work_orders_participant_update on work_orders;
create policy work_orders_participant_update on work_orders
  for update using (
    user_id = auth.uid()::uuid
    or service_provider_auth_uid = auth.uid()::uuid
  ) with check (
    user_id = auth.uid()::uuid
    or service_provider_auth_uid = auth.uid()::uuid
  );
