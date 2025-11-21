# Backend Abstraction Layer

This directory contains the backend abstraction layer that makes EQPMGR truly backend-agnostic. It uses a clean, object-oriented architecture where backends are self-contained, pluggable modules registered in a single location.

## Why This Architecture?

❌ **Old Way (Ad-hoc switching):**
```typescript
// BAD: if/else everywhere
if (backend === 'firebase') {
  // Firebase code...
} else if (backend === 'supabase') {
  // Supabase code...
}
```

✅ **New Way (Registry pattern):**
```typescript
// GOOD: Single registry, zero if/else
const BACKEND_REGISTRY = {
  firebase: FirebaseProvider,
  supabase: SupabaseProvider,
};
// Just lookup and instantiate!
```

**Benefits:**
- No if/else switching in application code
- Adding a new backend = 1 line in registry
- Each backend is fully self-contained
- Type-safe and testable
- Clean separation of concerns

## Architecture Overview

```
src/backend/
├── interfaces/          # TypeScript interface contracts
│   ├── IBackendProvider.ts # Core provider interface
│   ├── IAuthProvider.ts    # Authentication operations
│   ├── IDatabase.ts        # Database CRUD and queries
│   ├── IStorage.ts         # File storage operations
│   └── index.ts
├── config/              # Configuration loading system
│   └── loader.ts           # Generic config loader (no if/else!)
├── firebase/            # Firebase backend module
│   ├── FirebaseProvider.ts     # Provider class
│   ├── FirebaseAuthAdapter.ts  # Auth implementation
│   ├── FirebaseDbAdapter.ts    # Database implementation
│   ├── FirebaseStorageAdapter.ts # Storage implementation
│   ├── config.ts              # Firebase config loader
│   └── index.ts
├── supabase/            # Supabase backend module
│   ├── SupabaseProvider.ts     # Provider class
│   ├── SupabaseAuthAdapter.ts  # Auth implementation
│   ├── SupabaseDbAdapter.ts    # Database implementation
│   ├── SupabaseStorageAdapter.ts # Storage implementation
│   ├── config.ts              # Supabase config loader
│   └── index.ts
├── factory.ts           # Clean registry-based factory
├── types.ts             # Backend-agnostic data models
└── README.md
```

## How to Add a New Backend

Adding a new backend (e.g., MongoDB, PocketBase, etc.) is incredibly simple:

### Step 1: Create Provider Class

```typescript
// src/backend/mongodb/MongoProvider.ts
import type { IBackendProvider, IAuthProvider, IDatabase, IStorage } from '../interfaces';

export class MongoProvider implements IBackendProvider {
  readonly name = 'mongodb';

  async initialize() {
    // Initialize MongoDB connection
  }

  isInitialized() { return this.initialized; }
  getAuth() { return new MongoAuthAdapter(); }
  getDb() { return new MongoDbAdapter(); }
  getStorage() { return new MongoStorageAdapter(); }
  getServerAuth() { return new MongoAuthAdapter(true); }
  getServerDb() { return new MongoDbAdapter(true); }
}
```

### Step 2: Create Config Module

```typescript
// src/backend/mongodb/config.ts
export function getServerConfig() {
  return {
    provider: 'mongodb',
    connectionString: process.env.MONGODB_CONNECTION_STRING,
  };
}
```

### Step 3: Add to Registry

```typescript
// src/backend/factory.ts
import { MongoProvider } from './mongodb/MongoProvider';

const BACKEND_REGISTRY = {
  firebase: FirebaseProvider,
  supabase: SupabaseProvider,
  mongodb: MongoProvider,  // ← That's it!
};
```

### Step 4: Update Config Loader

```typescript
// src/backend/config/loader.ts
import * as mongoConfig from '../mongodb/config';

const CONFIG_LOADERS = {
  firebase: firebaseConfig,
  supabase: supabaseConfig,
  mongodb: mongoConfig,  // ← Add here too
};
```

**That's it! No other code changes needed.** The factory, API routes, and application code all work automatically with the new backend.

## Configuration

### Environment Variables

Set the backend provider using environment variables:

```bash
# Choose backend provider: 'firebase' or 'supabase'
NEXT_PUBLIC_BACKEND_PROVIDER=firebase

# Firebase Configuration (when using Firebase)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
FIREBASE_API_KEY=your_api_key  # Server-side
FIREBASE_PROJECT_ID=your_project_id  # Server-side

# Supabase Configuration (when using Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Server-side only
```

## Usage

### Client-Side Usage

```typescript
import { getAuth, getDb, getStorage } from '@/backend/factory';

// In a component or client-side function
async function example() {
  // Get backend services
  const auth = await getAuth();
  const db = await getDb();
  const storage = await getStorage();

  // Use authentication
  const user = await auth.signInWithEmailAndPassword(email, password);

  // Query database
  const snapshot = await db.getDoc('app_users', userId);
  const userData = snapshot.data;

  // Upload file
  const result = await storage.uploadFromDataURL('avatars/user123', dataUrl);
}
```

### Server-Side Usage (Server Actions & API Routes)

```typescript
'use server';

import { getServerAuth, getServerDb } from '@/backend/factory';

export async function serverAction() {
  // Get server-side backend services (uses admin/service credentials)
  const auth = await getServerAuth();
  const db = await getServerDb();

  // Verify authentication
  const token = // ... get token from request
  const decodedToken = await auth.verifyIdToken(token);

  // Query database with elevated permissions
  const snapshot = await db.getDoc('app_users', decodedToken.uid);

  return snapshot.data;
}
```

### Real-time Subscriptions

```typescript
import { getDb } from '@/backend/factory';

async function subscribeToWorkOrders(userId: string) {
  const db = await getDb();

  // Subscribe to work orders for a user
  const unsubscribe = db.onSnapshotQuery(
    'workOrders',
    (snapshot) => {
      const workOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data
      }));
      console.log('Work orders updated:', workOrders);
    },
    (error) => {
      console.error('Subscription error:', error);
    },
    { type: 'where', field: 'userId', op: '==', value: userId }
  );

  // Cleanup
  return unsubscribe;
}
```

### Batch Operations

```typescript
import { getDb } from '@/backend/factory';

async function batchUpdate() {
  const db = await getDb();
  const batch = db.batch();

  // Queue multiple operations
  batch.set('app_users', 'user1', { name: 'John' });
  batch.update('app_users', 'user2', { lastLogin: new Date() });
  batch.delete('app_users', 'user3');

  // Commit all operations atomically
  await batch.commit();
}
```

### Field Values

```typescript
import { getDb } from '@/backend/factory';

async function useFieldValues() {
  const db = await getDb();

  await db.updateDoc('app_users', userId, {
    lastLogin: db.serverTimestamp(),        // Server timestamp
    loginCount: db.increment(1),             // Increment counter
    roles: db.arrayUnion('admin'),           // Add to array
    tags: db.arrayRemove('guest'),           // Remove from array
    tempField: db.deleteField(),             // Delete field
  });
}
```

### Vector Search

```typescript
import { getDb } from '@/backend/factory';

async function findSimilarComponents(queryVector: number[]) {
  const db = await getDb();

  const results = await db.findNearest(
    'masterComponents',
    'embedding',
    queryVector,
    {
      limit: 10,
      distanceMeasure: 'COSINE'
    }
  );

  return results.map(doc => ({
    id: doc.id,
    data: doc.data,
    similarity: doc.distance
  }));
}
```

## Interfaces

### IAuthProvider

Handles user authentication and session management.

**Key Methods:**
- `onAuthStateChanged()` - Listen to auth state changes
- `signInWithEmailAndPassword()` - Email/password login
- `createUserWithEmailAndPassword()` - User registration
- `signOut()` - Logout
- `verifyIdToken()` - Server-side token verification
- `createSessionCookie()` - Create session cookie
- `updateProfile()` - Update user profile

### IDatabase

Provides database operations including CRUD, queries, transactions, and real-time subscriptions.

**Key Methods:**
- `getDoc()`, `getDocs()` - Read operations
- `setDoc()`, `updateDoc()`, `deleteDoc()` - Write operations
- `getSubDoc()`, `getSubDocs()`, `setSubDoc()` - Subcollection operations
- `onSnapshot()`, `onSnapshotQuery()` - Real-time subscriptions
- `batch()` - Batch writes
- `runTransaction()` - Transactions
- `findNearest()` - Vector similarity search
- `serverTimestamp()`, `increment()`, `arrayUnion()`, etc. - Field values

### IStorage

Handles file storage operations.

**Key Methods:**
- `uploadFromDataURL()` - Upload base64 data
- `uploadFile()` - Upload File/Blob
- `getDownloadURL()` - Get public URL
- `deleteFile()` - Delete file
- `fileExists()` - Check existence

## Data Models

All data models are defined in `types.ts` and are backend-agnostic. They use standard JavaScript types instead of backend-specific types (e.g., `Date` instead of Firebase's `Timestamp`).

**Key Types:**
- `UserProfile` - User data with preferences
- `Equipment` - Bikes, shoes, and other gear
- `Component` - Equipment components
- `MasterComponent` - Component catalog
- `WorkOrder` - Service requests
- `ServiceProvider` - Bike shops and fitters
- `MaintenanceLog` - Service history

## Implementation Status

### ✅ Completed
- Backend interface definitions
- Firebase adapters (Auth, Database, Storage)
- Backend factory and service management
- Common data models
- Supabase adapter stubs

### 🚧 In Progress
- Supabase adapter implementations
- Code refactoring to use abstractions
- Data migration scripts

### 📋 Pending
- Postgres schema design
- Supabase project setup
- Full Supabase implementation
- Integration testing
- Migration scripts

## Migration Strategy

The migration follows a "big bang" approach:

1. **Phase 1: Abstraction (Current)**
   - Create interface contracts ✅
   - Implement Firebase adapters ✅
   - Create Supabase stubs ✅

2. **Phase 2: Supabase Setup**
   - Set up Supabase project
   - Design Postgres schema
   - Configure services (Auth, Storage, Realtime)

3. **Phase 3: Supabase Implementation**
   - Implement auth adapter
   - Implement database adapter
   - Implement storage adapter

4. **Phase 4: Code Refactoring**
   - Update all components to use backend factory
   - Update server actions
   - Update API routes
   - Replace direct Firebase imports

5. **Phase 5: Data Migration**
   - Export Firebase data
   - Transform to Postgres schema
   - Import to Supabase
   - Validate data integrity

6. **Phase 6: Testing & Deployment**
   - Unit tests for adapters
   - Integration tests
   - Staging deployment
   - Production cutover

## Best Practices

1. **Always use the factory**
   ```typescript
   // ✅ Good
   const db = await getDb();

   // ❌ Bad
   import { db } from '@/lib/firebase';
   ```

2. **Use common types**
   ```typescript
   // ✅ Good
   import { Equipment } from '@/backend/types';

   // ❌ Bad
   import { Timestamp } from 'firebase/firestore';
   ```

3. **Handle timestamps properly**
   ```typescript
   // Convert to/from backend timestamps
   const timestamp = db.toTimestamp(new Date());
   const date = db.fromTimestamp(timestamp);
   ```

4. **Use server-side services in server contexts**
   ```typescript
   // ✅ Good (in server action)
   const db = await getServerDb();

   // ❌ Bad (in server action)
   const db = await getDb();
   ```

5. **Clean up subscriptions**
   ```typescript
   useEffect(() => {
     const unsubscribe = db.onSnapshot(/* ... */);
     return () => unsubscribe();
   }, []);
   ```

## Testing

```typescript
import { resetBackend } from '@/backend/factory';

// In tests, reset the backend between test cases
afterEach(() => {
  resetBackend();
});
```

## Troubleshooting

### "Backend provider not configured"
Ensure `NEXT_PUBLIC_BACKEND_PROVIDER` is set in your environment variables.

### "Database not initialized"
Make sure to `await` the factory functions before using services.

### "Method not implemented" (Supabase)
Supabase adapters are currently stubs. Full implementation is pending.

### Type errors with Timestamp
Use `db.toTimestamp()` and `db.fromTimestamp()` to convert between Date and backend-specific timestamp types.

## Contributing

When adding new backend operations:

1. Add the method signature to the appropriate interface
2. Implement it in all adapters (Firebase + Supabase)
3. Update this README with usage examples
4. Add tests

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Project Architecture Diagram](../../docs/architecture.md)
