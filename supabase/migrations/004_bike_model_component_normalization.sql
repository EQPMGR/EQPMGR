-- Normalize bike models, master components, and equipment component lifecycle data

-- 1. Add canonical lifecycle fields to master_components
alter table master_components
  add column if not exists recommended_interval_km numeric,
  add column if not exists replacement_interval_km numeric,
  add column if not exists observed_interval_km_avg numeric,
  add column if not exists observed_interval_km_count int default 0,
  add column if not exists observed_interval_km_median numeric;

-- 2. Add bike model association to equipment
alter table equipment
  add column if not exists master_bike_model_id uuid references bike_models(id) on delete set null;

-- 3. Add installed component lifecycle fields to components
alter table components
  add column if not exists installed_at_distance numeric default 0,
  add column if not exists current_distance numeric default 0,
  add column if not exists expected_replacement_km numeric,
  add column if not exists is_active boolean default true,
  add column if not exists replacement_count int default 0,
  add column if not exists installed_at timestamptz default now();

-- 4. Create bike model component join table
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

-- 5. Add replacement events for lifecycle tracking
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

-- 6. Improve master component dedupe via slug
alter table master_components
  add column if not exists slug text;

create unique index if not exists master_components_slug_unique on master_components(slug) where slug is not null;
