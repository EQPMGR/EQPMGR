-- 001_create_core_tables.sql
-- Idempotent migration for core EQPMGR tables and policies
-- Creates extensions, core tables (equipment, components, master_components, bike_models,
-- service_providers, work_orders, counters, ignored_duplicates, _health_check),
-- indexes, grants, and RLS policies for user-scoped access.

-- NOTE: This file is safe to run multiple times (uses IF NOT EXISTS checks).

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Try to create pgvector if available; if not, continue and keep `embedding` as `real[]`.
DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pgvector';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector not available on this Postgres instance; continuing using real[] for embeddings. (%).', SQLERRM;
  END;
END
$$;

-- Table: equipment (user-scoped)
CREATE TABLE IF NOT EXISTS public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id uuid NOT NULL,
  name text NOT NULL,
  type text,
  brand text,
  model text,
  model_year integer,
  serial_number text,
  frame_size text,
  size text,
  shoe_size_system text,
  purchase_condition text,
  purchase_date timestamptz,
  purchase_price numeric,
  total_distance numeric DEFAULT 0,
  total_hours numeric DEFAULT 0,
  image_url text,
  wheelsets jsonb,
  associated_equipment_ids uuid[],
  maintenance_log jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: components (belongs to equipment)
CREATE TABLE IF NOT EXISTS public.components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL,
  parent_user_component_id uuid,
  master_component_id uuid,
  name text,
  wear_percentage numeric DEFAULT 0,
  last_service_date timestamptz,
  purchase_date timestamptz,
  notes text,
  size text,
  wheelset_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: master_components (catalog of component types)
-- Note: embedding stored as a real[] here for flexibility; if you prefer pgvector,
-- change the `embedding` column type to `vector(<dim>)` and create a suitable index.
CREATE TABLE IF NOT EXISTS public.master_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  series text,
  model text,
  system text,
  size text,
  size_variants jsonb,
  chainring1 text,
  chainring2 text,
  chainring3 text,
  embedding real[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: bike_models (public catalog)
CREATE TABLE IF NOT EXISTS public.bike_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text,
  model text,
  model_year integer,
  frame_size_options jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: service_providers
CREATE TABLE IF NOT EXISTS public.service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  shop_name text,
  logo_url text,
  services text[],
  address text,
  city text,
  province text,
  postal_code text,
  country text,
  phone text,
  website text,
  geohash text,
  lat double precision,
  lng double precision,
  average_rating numeric,
  rating_count integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: work_orders
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  user_phone text,
  user_email text,
  service_provider_id uuid,
  service_provider_auth_uid uuid,
  provider_name text,
  equipment_id uuid,
  equipment_name text,
  equipment_brand text,
  equipment_model text,
  service_type text,
  status text DEFAULT 'pending', -- pending | accepted | in-progress | completed | cancelled
  notes text,
  fit_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_consent jsonb
);

-- Table: counters (simple key/value counters)
CREATE TABLE IF NOT EXISTS public.counters (
  id text PRIMARY KEY,
  count bigint DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Table: ignored_duplicates
CREATE TABLE IF NOT EXISTS public.ignored_duplicates (
  id text PRIMARY KEY,
  ignored boolean DEFAULT true,
  ignored_at timestamptz DEFAULT now()
);

-- Table: _health_check (minimal diagnostic row)
CREATE TABLE IF NOT EXISTS public._health_check (
  id text PRIMARY KEY,
  last_checked timestamptz DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_equipment_app_user_id ON public.equipment (app_user_id);
CREATE INDEX IF NOT EXISTS idx_components_equipment_id ON public.components (equipment_id);
CREATE INDEX IF NOT EXISTS idx_master_components_name ON public.master_components USING gin (to_tsvector('english', coalesce(name,'')));

-- Example pgvector index (commented). If you switch embedding to `vector(<dim>)`, uncomment and set dim.
-- CREATE INDEX IF NOT EXISTS idx_master_components_embedding ON public.master_components USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Grants for authenticated role (allow basic client operations — RLS will enforce row-level constraints)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.equipment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.components TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.master_components TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bike_models TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.service_providers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.work_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.counters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ignored_duplicates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public._health_check TO authenticated;

-- Row Level Security (RLS) policies
-- Equipment: owner (app_user_id) can full access; service providers with an open work_order can update while open
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Select: allow authenticated users to read their own equipment
-- Select: allow authenticated users to read their own equipment
DROP POLICY IF EXISTS equipment_select_own ON public.equipment;
CREATE POLICY equipment_select_own ON public.equipment FOR SELECT TO authenticated USING (app_user_id = auth.uid()::uuid);

-- Insert: allow authenticated users to insert equipment for themselves
-- Insert: allow authenticated users to insert equipment for themselves
DROP POLICY IF EXISTS equipment_insert_own ON public.equipment;
CREATE POLICY equipment_insert_own ON public.equipment FOR INSERT TO authenticated WITH CHECK (app_user_id = auth.uid()::uuid);

-- Update: allow owners to update; allow service providers listed on an open work order to update
DROP POLICY IF EXISTS equipment_update_owner_or_provider ON public.equipment;
CREATE POLICY equipment_update_owner_or_provider ON public.equipment FOR UPDATE TO authenticated USING (
  app_user_id = auth.uid()::uuid OR
  EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.equipment_id = public.equipment.id
      AND wo.service_provider_auth_uid = auth.uid()::uuid
      AND wo.status IN ('pending','accepted','in-progress')
  )
) WITH CHECK (
  app_user_id = auth.uid()::uuid OR
  EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.equipment_id = public.equipment.id
      AND wo.service_provider_auth_uid = auth.uid()::uuid
      AND wo.status IN ('pending','accepted','in-progress')
  )
);

-- Delete: only owner may delete
DROP POLICY IF EXISTS equipment_delete_owner ON public.equipment;
CREATE POLICY equipment_delete_owner ON public.equipment FOR DELETE TO authenticated USING (app_user_id = auth.uid()::uuid);

-- Components: enforce ownership via the parent equipment's app_user_id; service providers with open work orders on the equipment may update
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS components_select_own ON public.components;
CREATE POLICY components_select_own ON public.components FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.equipment e WHERE e.id = public.components.equipment_id AND e.app_user_id = auth.uid()::uuid)
);

DROP POLICY IF EXISTS components_insert_own ON public.components;
CREATE POLICY components_insert_own ON public.components FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.equipment e WHERE e.id = public.components.equipment_id AND e.app_user_id = auth.uid()::uuid)
);

DROP POLICY IF EXISTS components_update_owner_or_provider ON public.components;
CREATE POLICY components_update_owner_or_provider ON public.components FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.equipment e WHERE e.id = public.components.equipment_id AND e.app_user_id = auth.uid()::uuid)
  OR EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.equipment_id = public.components.equipment_id
      AND wo.service_provider_auth_uid = auth.uid()::uuid
      AND wo.status IN ('pending','accepted','in-progress')
  )
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.equipment e WHERE e.id = public.components.equipment_id AND e.app_user_id = auth.uid()::uuid)
  OR EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.equipment_id = public.components.equipment_id
      AND wo.service_provider_auth_uid = auth.uid()::uuid
      AND wo.status IN ('pending','accepted','in-progress')
  )
);

DROP POLICY IF EXISTS components_delete_owner ON public.components;
CREATE POLICY components_delete_owner ON public.components FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.equipment e WHERE e.id = public.components.equipment_id AND e.app_user_id = auth.uid()::uuid)
);

-- Work orders RLS: owners (user_id) and the listed service provider auth uid can read/modify
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS work_orders_select_parties ON public.work_orders;
CREATE POLICY work_orders_select_parties ON public.work_orders FOR SELECT TO authenticated USING (
  user_id = auth.uid()::uuid OR service_provider_auth_uid = auth.uid()::uuid
);

DROP POLICY IF EXISTS work_orders_insert_requester ON public.work_orders;
CREATE POLICY work_orders_insert_requester ON public.work_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::uuid);

DROP POLICY IF EXISTS work_orders_update_parties ON public.work_orders;
CREATE POLICY work_orders_update_parties ON public.work_orders FOR UPDATE TO authenticated USING (
  user_id = auth.uid()::uuid OR service_provider_auth_uid = auth.uid()::uuid
) WITH CHECK (
  user_id = auth.uid()::uuid OR service_provider_auth_uid = auth.uid()::uuid
);

-- Ensure function to update `updated_at` timestamp exists for convenience (trigger)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach trigger to tables that have updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_equipment') THEN
    CREATE TRIGGER set_updated_at_equipment BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_components') THEN
    CREATE TRIGGER set_updated_at_components BEFORE UPDATE ON public.components FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_master_components') THEN
    CREATE TRIGGER set_updated_at_master_components BEFORE UPDATE ON public.master_components FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_bike_models') THEN
    CREATE TRIGGER set_updated_at_bike_models BEFORE UPDATE ON public.bike_models FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_service_providers') THEN
    CREATE TRIGGER set_updated_at_service_providers BEFORE UPDATE ON public.service_providers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_work_orders') THEN
    CREATE TRIGGER set_updated_at_work_orders BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- End of migration
