-- Initial Schema Migration for EQPMGR
-- Migrating from Firebase Firestore to Supabase Postgres
-- Created: 2025-11-09

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,  -- Firebase uid for migration compatibility
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  display_name TEXT,
  phone TEXT,
  photo_url TEXT,
  height NUMERIC,
  weight NUMERIC,
  shoe_size NUMERIC,
  birthdate DATE,
  measurement_system TEXT CHECK (measurement_system IN ('metric', 'imperial')) DEFAULT 'imperial',
  shoe_size_system TEXT CHECK (shoe_size_system IN ('us-womens', 'us-mens', 'uk', 'eu')) DEFAULT 'us-mens',
  distance_unit TEXT CHECK (distance_unit IN ('km', 'miles')) DEFAULT 'km',
  date_format TEXT CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD')) DEFAULT 'MM/DD/YYYY',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create index on uid for faster lookups
CREATE INDEX idx_users_uid ON users(uid);

-- ============================================
-- EQUIPMENT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- BikeType | 'Running Shoes' | 'Other' | 'Cycling Shoes'
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  model_year INTEGER,
  serial_number TEXT,
  frame_size TEXT,
  size TEXT,  -- For shoes
  shoe_size_system TEXT CHECK (shoe_size_system IN ('us', 'uk', 'eu')),
  purchase_condition TEXT CHECK (purchase_condition IN ('new', 'used')),
  purchase_date DATE NOT NULL,
  purchase_price NUMERIC DEFAULT 0,
  total_distance NUMERIC DEFAULT 0,
  total_hours NUMERIC DEFAULT 0,
  image_url TEXT,
  maintenance_log JSONB DEFAULT '[]'::jsonb,  -- Array of MaintenanceLog objects
  archived_components JSONB DEFAULT '[]'::jsonb,  -- Array of ArchivedComponent objects
  fit_data JSONB,  -- BikeFitData object
  associated_equipment_ids TEXT[],
  wheelsets JSONB,  -- Record<string, string>
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_equipment_user_id ON equipment(user_id);
CREATE INDEX idx_equipment_type ON equipment(type);

-- ============================================
-- COMPONENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  parent_component_id UUID REFERENCES components(id) ON DELETE SET NULL,
  master_component_id UUID,  -- Reference to master_components
  name TEXT NOT NULL,
  wear_percentage NUMERIC DEFAULT 0 CHECK (wear_percentage >= 0 AND wear_percentage <= 100),
  last_service_date DATE,
  purchase_date DATE NOT NULL,
  notes TEXT,
  size TEXT,
  wheelset_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_components_equipment_id ON components(equipment_id);
CREATE INDEX idx_components_master_id ON components(master_component_id);
CREATE INDEX idx_components_parent_id ON components(parent_component_id);

-- ============================================
-- MASTER COMPONENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS master_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  series TEXT,
  model TEXT,
  system TEXT NOT NULL,
  size TEXT,
  size_variants TEXT,  -- JSON string for size variants
  chainring1 TEXT,
  chainring2 TEXT,
  chainring3 TEXT,
  embedding vector(768),  -- Vector embedding for similarity search
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vector similarity search index (IVFFlat for better performance)
CREATE INDEX IF NOT EXISTS idx_master_components_embedding
  ON master_components USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Text search indexes
CREATE INDEX idx_master_components_name ON master_components(name);
CREATE INDEX idx_master_components_brand ON master_components(brand);
CREATE INDEX idx_master_components_system ON master_components(system);

-- ============================================
-- BIKE MODELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bike_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  bike_type TEXT NOT NULL,
  frame_sizes TEXT[],
  msrp NUMERIC,
  image_url TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bike_models_brand ON bike_models(brand);
CREATE INDEX idx_bike_models_type ON bike_models(bike_type);

-- ============================================
-- SERVICE PROVIDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  shop_name TEXT,
  logo_url TEXT,
  services TEXT[] DEFAULT '{}',  -- Array of service types
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  geohash TEXT,  -- For location-based queries
  lat NUMERIC,
  lng NUMERIC,
  average_rating NUMERIC CHECK (average_rating IS NULL OR (average_rating >= 0 AND average_rating <= 5)),
  rating_count INTEGER DEFAULT 0,
  availability TEXT,
  drop_off BOOLEAN DEFAULT false,
  valet_service BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Geospatial and location indexes
CREATE INDEX idx_service_providers_geohash ON service_providers(geohash);
CREATE INDEX idx_service_providers_city ON service_providers(city);
CREATE INDEX idx_service_providers_lat_lng ON service_providers(lat, lng);

-- ============================================
-- WORK ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  user_email TEXT NOT NULL,
  service_provider_id UUID REFERENCES service_providers(id) ON DELETE SET NULL,
  provider_name TEXT NOT NULL,
  equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
  equipment_name TEXT NOT NULL,
  equipment_brand TEXT NOT NULL,
  equipment_model TEXT NOT NULL,
  service_type TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'in-progress', 'completed', 'cancelled')) DEFAULT 'pending',
  notes TEXT,
  fit_data JSONB,  -- BikeFitData object
  user_consent_given BOOLEAN DEFAULT false,
  user_consent_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_work_orders_user_id ON work_orders(user_id);
CREATE INDEX idx_work_orders_provider_id ON work_orders(service_provider_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at DESC);

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  shop_owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_employees_shop_owner_id ON employees(shop_owner_id);
CREATE INDEX idx_employees_email ON employees(email);

-- ============================================
-- TRAINING DATA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  completion TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for category filtering
CREATE INDEX idx_training_data_category ON training_data(category);

-- ============================================
-- COUNTERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS counters (
  id TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

-- ============================================
-- IGNORED DUPLICATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ignored_duplicates (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all user-facing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = uid);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = uid);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = uid);

-- Equipment table policies
CREATE POLICY "Users can view own equipment" ON equipment
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE uid = auth.uid())
  );

CREATE POLICY "Users can insert own equipment" ON equipment
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE uid = auth.uid())
  );

CREATE POLICY "Users can update own equipment" ON equipment
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE uid = auth.uid())
  );

CREATE POLICY "Users can delete own equipment" ON equipment
  FOR DELETE USING (
    user_id IN (SELECT id FROM users WHERE uid = auth.uid())
  );

-- Components table policies
CREATE POLICY "Users can manage own components" ON components
  FOR ALL USING (
    equipment_id IN (
      SELECT id FROM equipment WHERE user_id IN (
        SELECT id FROM users WHERE uid = auth.uid()
      )
    )
  );

-- Master components - public read access
CREATE POLICY "Public read access to master components" ON master_components
  FOR SELECT USING (true);

-- Bike models - public read access
CREATE POLICY "Public read access to bike models" ON bike_models
  FOR SELECT USING (true);

-- Service providers - public read access
CREATE POLICY "Public read access to service providers" ON service_providers
  FOR SELECT USING (true);

-- Work orders policies
CREATE POLICY "Users can view own work orders" ON work_orders
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE uid = auth.uid())
  );

CREATE POLICY "Users can create work orders" ON work_orders
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE uid = auth.uid())
  );

CREATE POLICY "Users can update own work orders" ON work_orders
  FOR UPDATE USING (
    user_id IN (SELECT id FROM users WHERE uid = auth.uid())
  );

-- Employees policies
CREATE POLICY "Shop owners can manage employees" ON employees
  FOR ALL USING (
    shop_owner_id IN (SELECT id FROM users WHERE uid = auth.uid())
  );

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_components_updated_at
  BEFORE UPDATE ON components
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VECTOR SEARCH FUNCTION
-- ============================================

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION search_similar_components(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  brand TEXT,
  model TEXT,
  system TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    master_components.id,
    master_components.name,
    master_components.brand,
    master_components.model,
    master_components.system,
    1 - (master_components.embedding <=> query_embedding) AS similarity
  FROM master_components
  WHERE master_components.embedding IS NOT NULL
    AND 1 - (master_components.embedding <=> query_embedding) > match_threshold
  ORDER BY master_components.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- REALTIME PUBLICATION
-- ============================================

-- Enable realtime for work orders (most common use case)
-- Users will need to subscribe to their specific work orders
-- Note: This needs to be configured in Supabase dashboard as well
-- ALTER PUBLICATION supabase_realtime ADD TABLE work_orders;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'User profiles and preferences';
COMMENT ON TABLE equipment IS 'User-owned bikes, shoes, and other gear';
COMMENT ON TABLE components IS 'Components attached to equipment (subcollection in Firestore)';
COMMENT ON TABLE master_components IS 'Catalog of all available components with vector embeddings';
COMMENT ON TABLE bike_models IS 'Catalog of bike models';
COMMENT ON TABLE service_providers IS 'Bike shops and service providers';
COMMENT ON TABLE work_orders IS 'Service requests and bike fitting appointments';
COMMENT ON TABLE employees IS 'Shop employees managed by shop owners';
COMMENT ON TABLE training_data IS 'AI training data for component recognition';
COMMENT ON TABLE counters IS 'Application counters (e.g., insurance applications)';
COMMENT ON TABLE ignored_duplicates IS 'Tracking ignored duplicate components for cleanup';

-- ============================================
-- INITIAL DATA (Optional)
-- ============================================

-- Insert default counter
INSERT INTO counters (id, count) VALUES ('insuranceApplications', 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- MIGRATION HELPERS
-- ============================================

-- Helper view: Get equipment with component count
CREATE OR REPLACE VIEW equipment_summary AS
SELECT
  e.*,
  (SELECT COUNT(*) FROM components WHERE equipment_id = e.id) AS component_count
FROM equipment e;

-- Helper view: Get user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT
  u.id,
  u.uid,
  u.email,
  u.display_name,
  (SELECT COUNT(*) FROM equipment WHERE user_id = u.id) AS equipment_count,
  (SELECT COUNT(*) FROM work_orders WHERE user_id = u.id) AS work_order_count
FROM users u;

COMMENT ON VIEW equipment_summary IS 'Equipment with aggregated component counts';
COMMENT ON VIEW user_statistics IS 'User statistics for analytics';
