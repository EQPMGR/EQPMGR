-- Supabase initial schema for EQPMGR

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  email_verified boolean default false,
  display_name text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.admin_upsert_app_user(
  p_auth_user_id uuid,
  p_email text,
  p_display_name text
)
returns app_users
language sql
security definer
as $$
insert into app_users (id, email, display_name, created_at, updated_at)
values (p_auth_user_id, p_email, p_display_name, now(), now())
on conflict (id) do update
  set email = coalesce(excluded.email, app_users.email),
      display_name = coalesce(excluded.display_name, app_users.display_name),
      updated_at = now()
returning *;
$$;

create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  app_user_id uuid references app_users(id) on delete cascade,
  name text not null,
  type text,
  brand text,
  model text,
  model_year int,
  serial_number text,
  frame_size text,
  purchase_date date,
  purchase_price numeric,
  total_distance numeric default 0,
  total_hours numeric default 0,
  image_url text,
  maintenance_log jsonb,
  associated_equipment_ids uuid[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists components (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  master_component_id uuid,
  wear_percentage numeric default 0,
  purchase_date date,
  last_service_date date,
  notes text,
  size text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists work_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  user_name text,
  user_phone text,
  user_email text,
  service_provider_id uuid,
  service_provider_auth_uid uuid,
  provider_name text,
  equipment_id uuid references equipment(id) on delete set null,
  equipment_name text,
  equipment_brand text,
  equipment_model text,
  service_type text,
  status text,
  notes text,
  fit_data jsonb,
  user_consent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists bike_models (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  model_year int,
  frame_size text,
  slug text unique,
  components jsonb,
  image_url text,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create extension if not exists vector;

create table if not exists master_components (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  series text,
  model text,
  size text,
  size_variants jsonb,
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function search_similar_components(query_embedding vector, match_count int)
returns table(id uuid, similarity float) as $$
  select id, (embedding <=> query_embedding) as similarity
  from master_components
  where embedding is not null
  order by similarity
  limit match_count;
$$ language sql stable;

-- Row Level Security policies
alter table app_users enable row level security;
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

alter table equipment enable row level security;
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

alter table components enable row level security;
drop policy if exists components_select_own on components;
create policy components_select_own on components
  for select using (exists (
    select 1
    from equipment e
    where e.id = components.equipment_id
      and (e.user_id = auth.uid()::uuid or e.app_user_id = auth.uid()::uuid)
  ));

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
drop policy if exists components_insert_own on components;
create policy components_insert_own on components
  for insert with check (exists (
    select 1
    from equipment e
    where e.id = equipment_id
      and (e.user_id = auth.uid()::uuid or e.app_user_id = auth.uid()::uuid)
  ));
drop policy if exists components_update_own on components;
create policy components_update_own on components
  for update using (exists (
    select 1
    from equipment e
    where e.id = components.equipment_id
      and (e.user_id = auth.uid()::uuid or e.app_user_id = auth.uid()::uuid)
  ))
  with check (exists (
    select 1
    from equipment e
    where e.id = equipment_id
      and (e.user_id = auth.uid()::uuid or e.app_user_id = auth.uid()::uuid)
  ));

