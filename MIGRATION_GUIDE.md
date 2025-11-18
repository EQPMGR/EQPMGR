# Backend Abstraction Migration Guide

This guide outlines the steps to complete the migration from a Firebase-only codebase to a backend-agnostic architecture supporting both Firebase and Supabase.

## Current Status

### ✅ Completed (Phase 1: Foundation)

1. **Backend Abstraction Layer**
   - Created interface contracts (`IAuthProvider`, `IDatabase`, `IStorage`)
   - Implemented Firebase adapters wrapping existing Firebase code
   - Created Supabase adapter stubs (placeholders)
   - Built backend factory for runtime provider selection
   - Defined backend-agnostic data models

2. **Infrastructure**
   - Added Supabase dependencies to `package.json`
   - Created comprehensive documentation
   - Set up environment variable structure

**Files Created:**
- `src/backend/interfaces/` (4 files)
- `src/backend/firebase/` (3 adapters)
- `src/backend/supabase/` (3 stubs)
- `src/backend/factory.ts`
- `src/backend/types.ts`
- `src/backend/README.md`
- `.env.backend.example`

## Next Steps

### Phase 2: Supabase Infrastructure Setup

#### 2.1 Create Supabase Project

```bash
# Option 1: Via Supabase Dashboard
# Visit https://app.supabase.com and create a new project

# Option 2: Via Supabase CLI
npm install -g supabase
supabase init
supabase start
```

**Tasks:**
- [ ] Create Supabase project
- [ ] Note down project URL and keys
- [ ] Install pgvector extension
- [ ] Configure authentication providers

#### 2.2 Design Postgres Schema

Create SQL migration files to replicate Firestore structure:

**Collections to Tables Mapping:**

```sql
-- src/supabase/migrations/001_initial_schema.sql

-- App_users table (replaces users collection)
CREATE TABLE app_users (
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
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Equipment table (replaces users/{uid}/equipment subcollection)
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  model_year INTEGER,
  serial_number TEXT,
  frame_size TEXT,
  size TEXT,
  shoe_size_system TEXT,
  purchase_condition TEXT CHECK (purchase_condition IN ('new', 'used')),
  purchase_date DATE NOT NULL,
  purchase_price NUMERIC DEFAULT 0,
  total_distance NUMERIC DEFAULT 0,
  total_hours NUMERIC DEFAULT 0,
  image_url TEXT,
  fit_data JSONB,
  associated_equipment_ids TEXT[],
  wheelsets JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Components table (replaces users/{uid}/equipment/{id}/components subcollection)
CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  parent_component_id UUID REFERENCES components(id),
  master_component_id UUID,  -- Reference to master_components
  name TEXT NOT NULL,
  wear_percentage NUMERIC DEFAULT 0,
  last_service_date DATE,
  purchase_date DATE NOT NULL,
  notes TEXT,
  size TEXT,
  wheelset_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Master Components table (replaces masterComponents collection)
CREATE TABLE master_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  series TEXT,
  model TEXT,
  system TEXT NOT NULL,
  size TEXT,
  size_variants TEXT,
  chainring1 TEXT,
  chainring2 TEXT,
  chainring3 TEXT,
  embedding vector(768),  -- For vector search with pgvector
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable vector similarity search
CREATE INDEX ON master_components USING ivfflat (embedding vector_cosine_ops);

-- Bike Models table
CREATE TABLE bike_models (
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

-- Service Providers table
CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  shop_name TEXT,
  logo_url TEXT,
  services TEXT[],
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  geohash TEXT,
  lat NUMERIC,
  lng NUMERIC,
  average_rating NUMERIC,
  rating_count INTEGER DEFAULT 0,
  availability TEXT,
  drop_off BOOLEAN DEFAULT false,
  valet_service BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Work Orders table
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  user_email TEXT NOT NULL,
  service_provider_id UUID REFERENCES service_providers(id),
  provider_name TEXT NOT NULL,
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT NOT NULL,
  equipment_brand TEXT NOT NULL,
  equipment_model TEXT NOT NULL,
  service_type TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'in-progress', 'completed', 'cancelled')) DEFAULT 'pending',
  notes TEXT,
  fit_data JSONB,
  user_consent_given BOOLEAN DEFAULT false,
  user_consent_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Maintenance Logs (stored as JSONB in equipment table)
-- Archived Components (stored as JSONB in equipment table)

-- Employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  shop_owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Training Data table
CREATE TABLE training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  completion TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Counters table
CREATE TABLE counters (
  id TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

-- Ignored Duplicates table
CREATE TABLE ignored_duplicates (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS) Policies
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own data
CREATE POLICY "Users can manage own data" ON app_users
  FOR ALL USING (auth.uid() = uid);

CREATE POLICY "Users can manage own equipment" ON equipment
  FOR ALL USING (
    user_id IN (SELECT id FROM app_users WHERE uid = auth.uid())
  );

CREATE POLICY "Users can manage own components" ON components
  FOR ALL USING (
    equipment_id IN (
      SELECT id FROM equipment WHERE user_id IN (
        SELECT id FROM app_users WHERE uid = auth.uid()
      )
    )
  );

-- Public read access to master data
CREATE POLICY "Public read access to master components" ON master_components
  FOR SELECT USING (true);

CREATE POLICY "Public read access to bike models" ON bike_models
  FOR SELECT USING (true);

CREATE POLICY "Public read access to service providers" ON service_providers
  FOR SELECT USING (true);

-- Work orders accessible by creator and assigned provider
CREATE POLICY "Work orders accessible by participants" ON work_orders
  FOR ALL USING (
    user_id IN (SELECT id FROM app_users WHERE uid = auth.uid())
    OR service_provider_id IN (
      SELECT id FROM service_providers WHERE id IN (
        -- Service provider access logic
        SELECT shop_owner_id FROM employees WHERE uid = auth.uid()
      )
    )
  );

-- Indexes for performance
CREATE INDEX idx_equipment_user_id ON equipment(user_id);
CREATE INDEX idx_components_equipment_id ON components(equipment_id);
CREATE INDEX idx_components_master_id ON components(master_component_id);
CREATE INDEX idx_work_orders_user_id ON work_orders(user_id);
CREATE INDEX idx_work_orders_provider_id ON work_orders(service_provider_id);
CREATE INDEX idx_service_providers_geohash ON service_providers(geohash);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_components_updated_at BEFORE UPDATE ON components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Tasks:**
- [ ] Create migration SQL files
- [ ] Test migrations in local Supabase
- [ ] Configure RLS policies
- [ ] Set up indexes for performance
- [ ] Enable pgvector extension

#### 2.3 Configure Supabase Services

**Authentication:**
```bash
# Enable email/password authentication in Supabase dashboard
# Configure email templates
# Set up SMTP for email verification
```

**Storage:**
```bash
# Create 'avatars' bucket
# Configure public access policies
# Set up CORS if needed
```

**Realtime:**
```bash
# Enable realtime on required tables
# Configure publication rules
```

**Tasks:**
- [ ] Enable email/password auth
- [ ] Configure email templates
- [ ] Create storage buckets
- [ ] Enable realtime subscriptions
- [ ] Set up Edge Functions (if needed)

### Phase 3: Implement Supabase Adapters

#### 3.1 SupabaseAuthAdapter

**File:** `src/backend/supabase/SupabaseAuthAdapter.ts`

**Key Implementation Points:**
- Use `@supabase/supabase-js` for client-side auth
- Use `@supabase/ssr` for server-side auth with Next.js
- Map Supabase user to `AuthUser` interface
- Implement session management with cookies
- Handle email verification flow

**Reference:**
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)

#### 3.2 SupabaseDbAdapter

**File:** `src/backend/supabase/SupabaseDbAdapter.ts`

**Key Implementation Points:**
- Map collection/document operations to table/row operations
- Implement query constraint conversion (where, orderBy, limit)
- Handle subcollections as foreign key relationships
- Implement real-time subscriptions using Supabase Realtime
- Vector search using pgvector
- Transactions using Postgres transactions
- Batch operations using Postgres batching

**Challenges:**
- Firestore subcollections → Postgres foreign keys
- Firestore FieldValues → Postgres equivalents
- Real-time listeners → Supabase Realtime channels

#### 3.3 SupabaseStorageAdapter

**File:** `src/backend/supabase/SupabaseStorageAdapter.ts`

**Key Implementation Points:**
- Use Supabase Storage SDK
- Handle data URL uploads
- Map to Firebase Storage API surface
- Implement file deletion and existence checks

**Tasks:**
- [ ] Implement SupabaseAuthAdapter
- [ ] Implement SupabaseDbAdapter
- [ ] Implement SupabaseStorageAdapter
- [ ] Test each adapter independently
- [ ] Verify interface compliance

### Phase 4: Code Refactoring

#### 4.1 Update Auth Context

**File:** `src/context/auth-context.tsx`

**Changes:**
```typescript
// Before
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, ... } from 'firebase/auth';

// After
import { getAuth, getDb, getStorage } from '@/backend';
```

#### 4.2 Update Components (49 files)

**Pattern:**
```typescript
// Before
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const q = query(collection(db, 'equipment'), where('userId', '==', uid));
const snapshot = await getDocs(q);

// After
import { getDb } from '@/backend';

const db = await getDb();
const snapshot = await db.getDocs('equipment',
  { type: 'where', field: 'userId', op: '==', value: uid }
);
```

**Files to Update:**
- All files in `src/app/` that import Firebase
- All files in `src/components/` that import Firebase
- Service layer files

#### 4.3 Update Server Actions

**Files:** `src/app/**/actions.ts`

**Pattern:**
```typescript
// Before
import { adminDb } from '@/lib/firebase-admin';

// After
import { getServerDb } from '@/backend';
const db = await getServerDb();
```

#### 4.4 Update API Routes

**Files:** `src/app/api/**/route.ts`

**Changes:**
- Update `/api/config` to serve correct backend config
- Update all routes to use backend factory

**Tasks:**
- [ ] Update auth-context.tsx
- [ ] Update all 49 component files
- [ ] Update server action files (8+)
- [ ] Update API routes (4+)
- [ ] Update service layer files
- [ ] Remove direct Firebase imports
- [ ] Test each updated module

### Phase 5: Data Migration

#### 5.1 Export Firebase Data

**Script:** `scripts/export-firebase-data.ts`

```typescript
import { adminDb } from '@/lib/firebase-admin';
import * as fs from 'fs';

async function exportCollection(collectionName: string) {
  const snapshot = await adminDb.collection(collectionName).get();
  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  fs.writeFileSync(
    `./migration-data/${collectionName}.json`,
    JSON.stringify(data, null, 2)
  );
}

// Export all collections
await exportCollection('app_users');
await exportCollection('masterComponents');
await exportCollection('bikeModels');
// ... etc
```

#### 5.2 Transform Data

**Script:** `scripts/transform-firebase-to-postgres.ts`

```typescript
// Convert Firestore structure to Postgres structure
// Handle:
// - Timestamp → ISO strings
// - Subcollections → foreign keys
// - FieldValue → actual values
// - Document IDs → UUIDs (with mapping)
```

#### 5.3 Import to Supabase

**Script:** `scripts/import-to-supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, serviceKey);

async function importUsers(users: any[]) {
  const { data, error } = await supabase
    .from('app_users')
    .insert(users);

  if (error) console.error('Import error:', error);
}
```

#### 5.4 Migrate Users

**Script:** `scripts/migrate-auth-users.ts`

```typescript
// Export Firebase Auth users
// Create corresponding Supabase Auth users
// Preserve UIDs for data consistency
```

**Important Note About Table Names:**

The application uses a table named `app_users` (not `users`). Client-side code must query `app_users`. Do NOT create a `public.users` view. If your import script previously inserted into `users`, update it to insert into `app_users`. This ensures proper REST API access via `/rest/v1/app_users`.

**Tasks:**
- [ ] Create export scripts
- [ ] Create transformation scripts
- [ ] Create import scripts
- [ ] Create auth migration script
- [ ] Test on sample data
- [ ] Validate data integrity
- [ ] Create rollback plan

### Phase 6: Testing

#### 6.1 Unit Tests

**Files:** `src/backend/__tests__/`

```typescript
describe('FirebaseAuthAdapter', () => {
  it('should sign in user', async () => {
    const adapter = new FirebaseAuthAdapter();
    const user = await adapter.signInWithEmailAndPassword(email, password);
    expect(user.email).toBe(email);
  });
});
```

#### 6.2 Integration Tests

Test full user flows:
- User registration → equipment creation → component addition
- Work order creation → service provider assignment
- Vector search functionality
- Real-time subscriptions

#### 6.3 Backend Switching Tests

Test that app works with both backends:

```typescript
describe('Backend Switching', () => {
  it('should work with Firebase', async () => {
    process.env.NEXT_PUBLIC_BACKEND_PROVIDER = 'firebase';
    // Run tests
  });

  it('should work with Supabase', async () => {
    process.env.NEXT_PUBLIC_BACKEND_PROVIDER = 'supabase';
    // Run tests
  });
});
```

**Tasks:**
- [ ] Write unit tests for adapters
- [ ] Write integration tests
- [ ] Test backend switching
- [ ] Performance testing
- [ ] Load testing

### Phase 7: Deployment

#### 7.1 Staging Environment

```bash
# Deploy to staging with Firebase
NEXT_PUBLIC_BACKEND_PROVIDER=firebase npm run build
# Deploy and test

# Deploy to staging with Supabase
NEXT_PUBLIC_BACKEND_PROVIDER=supabase npm run build
# Deploy and test
```

#### 7.2 Production Migration

1. **Pre-migration:**
   - [ ] Announce maintenance window
   - [ ] Backup all Firebase data
   - [ ] Prepare rollback plan

2. **Migration:**
   - [ ] Run data export scripts
   - [ ] Run transformation scripts
   - [ ] Import to Supabase
   - [ ] Validate data
   - [ ] Test auth migration

3. **Cutover:**
   - [ ] Update environment variables
   - [ ] Deploy new code
   - [ ] Monitor error logs
   - [ ] Verify functionality

4. **Post-migration:**
   - [ ] Monitor for 48 hours
   - [ ] Keep Firebase read-only backup for 30 days
   - [ ] Document any issues

## Estimated Timeline

- **Phase 2:** Supabase Setup - 1 week
- **Phase 3:** Adapter Implementation - 2 weeks
- **Phase 4:** Code Refactoring - 2-3 weeks
- **Phase 5:** Data Migration - 1 week
- **Phase 6:** Testing - 1 week
- **Phase 7:** Deployment - 3 days

**Total:** 7-8 weeks

## Rollback Plan

If issues occur after migration:

1. Revert environment variable: `NEXT_PUBLIC_BACKEND_PROVIDER=firebase`
2. Redeploy previous code version
3. Firebase data remains unchanged (read-only backup)
4. Investigate and fix issues
5. Retry migration

## Key Decisions & Trade-offs

### Subcollections → Foreign Keys

**Firebase:** `users/{uid}/equipment/{id}/components/{cid}`
**Postgres:** `components` table with `equipment_id` foreign key

**Trade-off:** Slightly different query patterns, but more normalized data.

### Real-time Subscriptions

**Firebase:** Built-in with Firestore
**Supabase:** Requires Realtime extension on Postgres

**Trade-off:** Supabase Realtime has different scaling characteristics.

### Vector Search

**Firebase:** Native `findNearest()` query
**Supabase:** pgvector extension with custom RPC functions

**Trade-off:** May need to create Postgres functions for vector search.

### Timestamps

**Firebase:** Firestore Timestamp object
**Supabase:** Postgres TIMESTAMPTZ

**Solution:** Abstracted via `toTimestamp()` / `fromTimestamp()` methods.

## Support & Questions

- Review `src/backend/README.md` for API documentation
- Check Supabase docs: https://supabase.com/docs
- Firebase migration guide: https://firebase.google.com/docs/guides

## Next Immediate Steps

1. Set up Supabase project
2. Create Postgres schema
3. Implement SupabaseAuthAdapter
4. Test authentication flow
5. Proceed to database adapter

Good luck with the migration! 🚀
