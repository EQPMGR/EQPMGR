# Quick Start Guide - Backend Abstraction

Get up and running with the new backend-agnostic architecture in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Firebase or Supabase account (or both!)
- Your backend credentials ready

---

## Option 1: Using Firebase (Default)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set:

```bash
# Choose backend
NEXT_PUBLIC_BACKEND_PROVIDER=firebase

# Firebase credentials
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here

# Server-side (for admin SDK)
FIREBASE_API_KEY=your_api_key_here
FIREBASE_PROJECT_ID=your_project_id_here

# Other API keys (optional)
GEMINI_API_KEY=your_gemini_key_here
```

### Step 3: Run

```bash
npm run dev
```

Visit http://localhost:3000 - You're running on Firebase! 🔥

---

## Option 2: Using Supabase

### Step 1: Set Up Supabase Project

```bash
# Install Supabase CLI (optional, for local development)
npm install -g supabase

# Initialize Supabase (if not already done)
supabase init

# Start local Supabase (optional)
supabase start
```

### Step 2: Run Migrations

```bash
# Apply the schema to your Supabase database
# Option A: Via Supabase CLI
supabase db push

# Option B: Via Supabase Dashboard
# 1. Go to https://app.supabase.com
# 2. Select your project
# 3. Go to SQL Editor
# 4. Run the SQL from: supabase/migrations/001_initial_schema.sql
```

### Step 3: Configure Environment

Edit `.env`:

```bash
# Choose backend
NEXT_PUBLIC_BACKEND_PROVIDER=supabase

# Supabase credentials (from your Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Server-side (service role key - keep secret!)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 4: Implement Adapters

**Note:** Supabase adapters are currently stubs. You need to implement them:

```bash
# Files to implement:
# - src/backend/supabase/SupabaseAuthAdapter.ts
# - src/backend/supabase/SupabaseDbAdapter.ts
# - src/backend/supabase/SupabaseStorageAdapter.ts

# Follow the pattern from Firebase adapters
# See: src/backend/firebase/*Adapter.ts
```

### Step 5: Run

```bash
npm run dev
```

---

## Switching Between Backends

The beauty of this architecture: **just change one environment variable!**

### Switch to Firebase

```bash
# Edit .env
NEXT_PUBLIC_BACKEND_PROVIDER=firebase

# Restart dev server
npm run dev
```

### Switch to Supabase

```bash
# Edit .env
NEXT_PUBLIC_BACKEND_PROVIDER=supabase

# Restart dev server
npm run dev
```

**No code changes needed!** The application automatically uses the correct backend.

---

## Verify Everything Works

### 1. Check Build

```bash
npm run build
```

Should complete without errors.

### 2. Check Type Safety

```bash
npm run typecheck
```

Should show no errors (or only pre-existing ones).

### 3. Test Authentication

1. Visit http://localhost:3000
2. Sign up for a new account
3. Check that user is created in your backend (Firebase or Supabase)
4. Verify email verification flow
5. Log in and access dashboard

### 4. Test Database Operations

1. Create a piece of equipment
2. Add components to it
3. Verify data appears in your backend
4. Test real-time updates (create a work order)

---

## Project Structure

```
EQPMGR/
├── src/
│   ├── backend/              ← Backend abstraction layer
│   │   ├── interfaces/       ← Contracts (IBackendProvider, etc.)
│   │   ├── firebase/         ← Firebase implementation
│   │   ├── supabase/         ← Supabase implementation
│   │   ├── config/           ← Config loader system
│   │   └── factory.ts        ← Registry pattern
│   │
│   ├── app/                  ← Next.js app router
│   ├── components/           ← React components
│   └── context/              ← React context (auth, etc.)
│
├── supabase/                 ← Supabase-specific files
│   ├── migrations/           ← Database schema
│   └── config.toml           ← Local dev config
│
├── .env                      ← Your configuration (gitignored)
├── .env.example              ← Example configuration
│
└── Documentation/
    ├── BACKEND_ARCHITECTURE.md          ← High-level overview
    ├── BACKEND_REFACTORING_EXAMPLES.md  ← Migration examples
    ├── BACKEND_MIGRATION_PROGRESS.md    ← Current status
    ├── MIGRATION_GUIDE.md               ← Complete migration plan
    └── QUICK_START.md                   ← This file
```

---

## Common Issues

### "Failed to fetch backend configuration"

**Solution:** Make sure your `.env` file has the correct backend credentials.

```bash
# For Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# For Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### "Backend provider 'supabase' not yet fully implemented"

**Solution:** This is expected. Supabase adapters are stubs. You need to implement them following the Firebase adapter patterns.

### Build errors after adding backend abstraction

**Solution:** Make sure you're importing from `@/backend` instead of `@/lib/firebase`:

```typescript
// ❌ Old way
import { auth, db } from '@/lib/firebase';

// ✅ New way
import { getAuth, getDb } from '@/backend';
const auth = await getAuth();
const db = await getDb();
```

### Type errors with Date vs Timestamp

**Solution:** Use `Date` objects everywhere. The adapters handle conversion automatically:

```typescript
// ✅ Just use Date
await db.setDoc('users', userId, {
  createdAt: new Date(),
  lastLogin: new Date(),
});
```

---

## Development Workflow

### Daily Development

```bash
# 1. Start dev server
npm run dev

# 2. Make your changes
# (Application code is backend-agnostic)

# 3. Test with current backend
# (Configured via NEXT_PUBLIC_BACKEND_PROVIDER)

# 4. Build to verify
npm run build
```

### Testing Different Backends

```bash
# Test with Firebase
NEXT_PUBLIC_BACKEND_PROVIDER=firebase npm run build
NEXT_PUBLIC_BACKEND_PROVIDER=firebase npm run dev

# Test with Supabase
NEXT_PUBLIC_BACKEND_PROVIDER=supabase npm run build
NEXT_PUBLIC_BACKEND_PROVIDER=supabase npm run dev
```

### Adding New Features

```typescript
// Always use the backend abstraction
import { getDb, getAuth, getStorage } from '@/backend';

async function myNewFeature() {
  const db = await getDb();

  // This works with ANY backend!
  await db.setDoc('collection', 'docId', {
    field: 'value',
    createdAt: new Date(),
  });
}
```

---

## Next Steps

### If Using Firebase

1. ✅ You're all set!
2. Start building features
3. All backend operations work automatically

### If Using Supabase

1. Implement the Supabase adapters
   - See `src/backend/firebase/*Adapter.ts` for reference
   - Implement `src/backend/supabase/*Adapter.ts`
2. Test each adapter individually
3. Run the full application
4. Migrate data from Firebase (if needed)

### If Adding New Backend

1. Read `BACKEND_ARCHITECTURE.md`
2. Create your provider class implementing `IBackendProvider`
3. Add to registry in `factory.ts`
4. Add config loader
5. Test and enjoy!

---

## Resources

- **Architecture Overview:** `BACKEND_ARCHITECTURE.md`
- **API Documentation:** `src/backend/README.md`
- **Migration Examples:** `BACKEND_REFACTORING_EXAMPLES.md`
- **Full Migration Plan:** `MIGRATION_GUIDE.md`
- **Progress Report:** `BACKEND_MIGRATION_PROGRESS.md`

---

## Get Help

- Check the documentation files listed above
- Review the implemented Firebase adapters as examples
- Look at `src/context/auth-context.tsx` for a complete refactoring example

---

**Remember:** The application code is **backend-agnostic**. You only need to configure which backend to use via environment variables!

🔥 **Happy coding!** 🚀
