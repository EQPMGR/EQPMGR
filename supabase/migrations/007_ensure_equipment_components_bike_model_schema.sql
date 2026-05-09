-- Migration 007: Ensure core equipment, components, and bike model schema supports all app writes

-- Equipment enhancements
alter table if exists equipment
  add column if not exists purchase_condition text,
  add column if not exists size text,
  add column if not exists shoe_size_system text,
  add column if not exists wheelsets jsonb,
  add column if not exists fit_data jsonb,
  add column if not exists archived_components jsonb,
  add column if not exists master_bike_model_id uuid references bike_models(id) on delete set null,
  add column if not exists frame_size text;

alter table if exists equipment
  add column if not exists image_url text;

-- Components enhancements
alter table if exists components
  add column if not exists parent_user_component_id uuid references components(id) on delete set null,
  add column if not exists master_component_id uuid references master_components(id) on delete set null,
  add column if not exists name text,
  add column if not exists wear_percentage numeric default 0,
  add column if not exists purchase_date date,
  add column if not exists last_service_date date,
  add column if not exists notes text,
  add column if not exists size text,
  add column if not exists wheelset_id uuid,
  add column if not exists installed_at_distance numeric default 0,
  add column if not exists current_distance numeric default 0,
  add column if not exists expected_replacement_km numeric,
  add column if not exists is_active boolean default true,
  add column if not exists replacement_count int default 0,
  add column if not exists installed_at timestamptz default now(),
  add column if not exists replaced_by_user boolean default false;

-- Bike models enhancements
alter table if exists bike_models
  add column if not exists type text,
  add column if not exists frame_size text,
  add column if not exists image_url text,
  add column if not exists slug text,
  add column if not exists created_by uuid references app_users(id) on delete set null;

alter table if exists bike_models
  drop column if exists components;

create unique index if not exists bike_models_slug_unique on bike_models(slug) where slug is not null;

-- Bike model components join table
create table if not exists bike_model_components (
  id uuid primary key default gen_random_uuid(),
  bike_model_id uuid not null references bike_models(id) on delete cascade,
  master_component_id uuid not null references master_components(id) on delete cascade,
  component_name text,
  system text,
  position text,
  size text,
  chainring1 text,
  chainring2 text,
  chainring3 text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists bike_model_components_bike_model_id_idx on bike_model_components(bike_model_id);
create index if not exists bike_model_components_master_component_id_idx on bike_model_components(master_component_id);

-- Replacement event table
create table if not exists component_replacement_events (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid references equipment(id) on delete cascade,
  equipment_component_id uuid references components(id) on delete cascade,
  master_component_id uuid references master_components(id) on delete cascade,
  actual_interval_km numeric,
  replacement_reason text,
  replaced_at_distance numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists component_replacement_events_equipment_id_idx on component_replacement_events(equipment_id);
create index if not exists component_replacement_events_equipment_component_id_idx on component_replacement_events(equipment_component_id);
create index if not exists component_replacement_events_master_component_id_idx on component_replacement_events(master_component_id);

-- Master component enhancements
alter table if exists master_components
  add column if not exists size_variants text,
  add column if not exists chainring1 text,
  add column if not exists chainring2 text,
  add column if not exists chainring3 text,
  add column if not exists recommended_interval_km numeric,
  add column if not exists replacement_interval_km numeric,
  add column if not exists observed_interval_km_avg numeric,
  add column if not exists observed_interval_km_count int default 0,
  add column if not exists observed_interval_km_median numeric,
  add column if not exists slug text;

create unique index if not exists master_components_slug_unique on master_components(slug) where slug is not null;
