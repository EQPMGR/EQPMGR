# Supabase Backend Setup Guide

This guide explains how to set up and use Supabase as the backend for EQPMGR.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup Instructions](#setup-instructions)
4. [Environment Configuration](#environment-configuration)
5. [Database Migration](#database-migration)
6. [Switching Between Backends](#switching-between-backends)
7. [Features and Limitations](#features-and-limitations)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

## Overview

EQPMGR supports two backend providers through a unified abstraction layer:
- **Firebase** (Firestore + Firebase Auth + Firebase Storage)
- **Supabase** (Postgres + Supabase Auth + Supabase Storage)

The Supabase implementation provides:
- ✅ **Authentication**: Email/password authentication with email verification
- ✅ **Database**: Full CRUD operations with real-time subscriptions
- ✅ **Storage**: File upload/download with public URLs
- ✅ **Vector Search**: pgvector-based similarity search for components
- ✅ **Subcollections**: Emulated via foreign keys
- ⚠️ **Batch Operations**: Emulated (not atomic like Firestore)
- ⚠️ **Transactions**: Simplified implementation (not ACID guaranteed)

## Prerequisites

1. **Node.js** 18+ and npm
2. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
3. **Supabase CLI** (optional but recommended):
   ```bash
   npm install -g supabase
   ```

## Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in project details:
   - **Name**: eqpmgr
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
4. Wait for project to be provisioned (~2 minutes)

### Step 2: Get API Credentials

From your project dashboard:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (for client-side)
   - **service_role** key (for server-side - keep secret!)

### Step 3: Run Database Migration

The migration script creates all necessary tables, indexes, RLS policies, and functions.

**Option A: Using Supabase Dashboard**

1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and click **Run**
5. Verify all tables are created (check **Database** → **Tables**)

**Option B: Using Supabase CLI**

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

### Step 4: Enable Realtime (Required for Subscriptions)

1. Go to **Database** → **Publications**
2. Find the `supabase_realtime` publication
3. Enable the following tables:
   - `equipment`
   - `components`
   - `work_orders`

Alternatively, run this SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE components;
ALTER PUBLICATION supabase_realtime ADD TABLE work_orders;
```

### Step 5: Create Storage Bucket

1. Go to **Storage**
2. Create a new bucket named `uploads`
3. Set it to **Public** bucket
4. Configure policies:
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Authenticated users can upload" ON storage.objects
     FOR INSERT WITH CHECK (
       bucket_id = 'uploads' AND auth.role() = 'authenticated'
     );

   -- Allow public read access
   CREATE POLICY "Public read access" ON storage.objects
     FOR SELECT USING (bucket_id = 'uploads');

   -- Allow users to delete own files
   CREATE POLICY "Users can delete own files" ON storage.objects
     FOR DELETE USING (
       bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]
     );
   ```

### Step 6: Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize the following templates:
   - **Confirm signup**: Email verification template
   - **Magic Link**: Magic link login template
   - **Change Email**: Email change confirmation

Update the redirect URLs to match your app:
```
{{ .SiteURL }}/verify-email
```

## Environment Configuration

### Development Environment

Create or update `.env` file:

```bash
# Backend Provider Selection
NEXT_PUBLIC_BACKEND_PROVIDER=supabase

# Supabase Configuration (Public - safe for client-side)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here

# Supabase Server Configuration (Secret - server-side only)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Other configurations (unchanged)
GEMINI_API_KEY=your_gemini_api_key
# ... rest of your environment variables
```

### Production Environment

Set the same environment variables in your hosting platform:

**Vercel:**
```bash
vercel env add NEXT_PUBLIC_BACKEND_PROVIDER
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

**Firebase App Hosting / Google Cloud Run:**
```bash
gcloud run services update eqpmgr \
  --update-env-vars NEXT_PUBLIC_BACKEND_PROVIDER=supabase,\
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co,\
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key,\
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Migration

### Migrating Data from Firebase to Supabase

The database schemas are designed to be compatible. Here's how to migrate:

**1. Export from Firestore**

```bash
# Install firestore-export
npm install -g node-firestore-import-export

# Export data
firestore-export --accountCredentials serviceAccountKey.json \
  --backupFile firestore-export.json
```

**2. Transform Data**

You'll need to transform the data format:
- Firestore uses document IDs; Supabase uses UUID primary keys
- Subcollections need to be flattened with foreign keys
- Timestamps need conversion from Firestore Timestamp to ISO strings

**3. Import to Supabase**

```sql
-- Example: Import users
INSERT INTO users (uid, email, display_name, created_at)
VALUES
  ('firebase_uid_1', 'user@example.com', 'John Doe', '2024-01-01T00:00:00Z'),
  ('firebase_uid_2', 'user2@example.com', 'Jane Smith', '2024-01-15T00:00:00Z');

-- Equipment with user relationship
INSERT INTO equipment (id, user_id, name, type, brand, model, purchase_date)
SELECT
  gen_random_uuid(),
  u.id,
  'My Road Bike',
  'Road',
  'Trek',
  'Domane SL7',
  '2023-06-01'
FROM users u WHERE u.uid = 'firebase_uid_1';
```

## Switching Between Backends

You can switch between Firebase and Supabase by changing one environment variable:

```bash
# Use Supabase
NEXT_PUBLIC_BACKEND_PROVIDER=supabase

# Use Firebase
NEXT_PUBLIC_BACKEND_PROVIDER=firebase
```

The entire application will automatically use the selected backend. All code uses the abstraction layer, so no code changes are needed.

## Features and Limitations

### Authentication

| Feature | Supabase | Firebase | Notes |
|---------|----------|----------|-------|
| Email/Password | ✅ | ✅ | Full support |
| Email Verification | ✅ | ✅ | Different URL params |
| Profile Updates | ✅ | ✅ | Stored in user_metadata |
| Session Management | ✅ | ✅ | JWT-based |
| Social Auth | ⚠️ | ✅ | Not implemented yet |

### Database

| Feature | Supabase | Firebase | Notes |
|---------|----------|----------|-------|
| CRUD Operations | ✅ | ✅ | Full support |
| Subcollections | ✅ | ✅ | Via foreign keys in Supabase |
| Real-time | ✅ | ✅ | Requires table configuration |
| Batch Writes | ⚠️ | ✅ | Not atomic in Supabase |
| Transactions | ⚠️ | ✅ | Simplified, not ACID |
| Vector Search | ✅ | ✅ | pgvector vs Firestore vector |
| Complex Queries | ✅ | ⚠️ | Postgres is more powerful |

**Supabase-specific Notes:**

- **Subcollections**: Implemented as separate tables with foreign keys (e.g., `components.equipment_id`)
- **Batch Operations**: Use `Promise.all()` instead of atomic batch (not transactional)
- **Transactions**: Basic optimistic locking (not full ACID guarantees)
- **Pagination**: `startAfter`/`startAt` not fully implemented

### Storage

| Feature | Supabase | Firebase | Notes |
|---------|----------|----------|-------|
| File Upload | ✅ | ✅ | Full support |
| Public URLs | ✅ | ✅ | Different URL format |
| File Deletion | ✅ | ✅ | Full support |
| Access Control | ✅ | ✅ | RLS policies vs Firebase rules |

### Performance Considerations

**Supabase Advantages:**
- Postgres supports complex joins and queries
- Better for analytical queries
- Built-in full-text search
- Native vector search with pgvector

**Supabase Limitations:**
- Cold starts for serverless functions
- Real-time subscriptions limited to table-level
- Batch operations not atomic

## Testing

### Test Supabase Connection

```bash
npm run dev
```

Open browser console and check for:
```
✅ Supabase client initialized: https://xxxxx.supabase.co
✅ SupabaseProvider initialized successfully
```

### Test Authentication

1. Navigate to `/register`
2. Create a new account
3. Check email for verification link
4. Click verification link → should redirect to `/verify-email`
5. Log in at `/login`

### Test Database Operations

1. Log in to the application
2. Add equipment → Check `equipment` table in Supabase dashboard
3. Add components → Check `components` table
4. Verify foreign keys are correct (`equipment_id` matches)

### Test Real-time

1. Open app in two browser windows
2. Make a change in one window
3. Verify update appears in other window

### Test Vector Search

1. Go to Admin → Vector Indexing page
2. Click "Generate Embeddings"
3. Search for components using similarity search
4. Verify results are returned

## Troubleshooting

### "Missing Supabase configuration" Error

**Cause**: Environment variables not set or not loaded

**Solution**:
```bash
# Verify .env file exists and contains:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Restart dev server
npm run dev
```

### "Failed to get document: relation does not exist"

**Cause**: Migration script not run or incomplete

**Solution**:
1. Go to Supabase dashboard → SQL Editor
2. Run the migration script again
3. Verify tables exist in **Database** → **Tables**

### Real-time Updates Not Working

**Cause**: Realtime not enabled for tables

**Solution**:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE components;
ALTER PUBLICATION supabase_realtime ADD TABLE work_orders;
```

### "Permission denied" Errors

**Cause**: Row Level Security (RLS) policies blocking access

**Solution**:
1. Check RLS policies in **Authentication** → **Policies**
2. Verify user is authenticated
3. Check policy conditions match your use case
4. For development, you can temporarily disable RLS:
   ```sql
   ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
   ```
   (Re-enable for production!)

### Vector Search Not Working

**Cause**: pgvector extension not enabled or index not created

**Solution**:
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index
CREATE INDEX IF NOT EXISTS idx_master_components_embedding
  ON master_components USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### Storage Upload Fails

**Cause**: Bucket doesn't exist or incorrect permissions

**Solution**:
1. Verify bucket `uploads` exists
2. Check bucket is set to Public
3. Verify storage policies allow uploads

### Type Errors in TypeScript

**Cause**: Supabase types not matching

**Solution**:
```bash
# Regenerate Supabase types
npx supabase gen types typescript --project-id <your-project-ref> > src/types/supabase.ts
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

## Support

For issues specific to the Supabase integration:
1. Check this documentation first
2. Check Supabase logs in dashboard
3. Check browser console for client-side errors
4. Check server logs for server-side errors
5. Open an issue on GitHub with error details

---

**Implementation Status**: ✅ Complete (All 41 methods implemented across 3 adapters)

Last Updated: 2025-11-09
