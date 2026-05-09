# EQPMGR Backend Architecture - Visual Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      EQPMGR Application                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Components  │  │    Pages     │  │Server Actions│        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                │
│                             │                                   │
│                    ┌────────▼────────┐                         │
│                    │  Backend Factory │                         │
│                    │  (Registry Based)│                         │
│                    └────────┬────────┘                         │
│                             │                                   │
│              ┌──────────────┼──────────────┐                  │
│              │              │              │                  │
│      ┌───────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐          │
│      │   getAuth()  │ │  getDb() │ │ getStorage()│          │
│      └───────┬──────┘ └────┬─────┘ └─────┬──────┘          │
│              │              │              │                  │
│              └──────────────┼──────────────┘                  │
│                             │                                   │
│                    ┌────────▼────────┐                         │
│                    │Backend Provider │                         │
│                    │  (Firebase or   │                         │
│                    │   Supabase)     │                         │
│                    └────────┬────────┘                         │
└─────────────────────────────┼───────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
    ┌───────▼────────┐              ┌──────────▼─────────┐
    │    Firebase     │              │     Supabase       │
    │  ┌───────────┐ │              │  ┌──────────────┐ │
    │  │   Auth    │ │              │  │  Auth (JWT)  │ │
    │  ├───────────┤ │              │  ├──────────────┤ │
    │  │ Firestore │ │              │  │  Postgres    │ │
    │  ├───────────┤ │              │  ├──────────────┤ │
    │  │  Storage  │ │              │  │   Storage    │ │
    │  └───────────┘ │              │  └──────────────┘ │
    └────────────────┘              └────────────────────┘
```

## Registry Pattern

```
┌─────────────────────────────────────────────────┐
│           Backend Registry (Factory)            │
│                                                 │
│  const BACKEND_REGISTRY = {                    │
│    firebase: FirebaseProvider,    ◄────────┐  │
│    supabase: SupabaseProvider,    ◄───────┐│  │
│    mongodb:  MongoProvider,       ◄──────┐││  │
│  }                                        │││  │
│                                          │││  │
│  ProviderClass = REGISTRY[providerName]  │││  │
│  provider = new ProviderClass()          │││  │
│  await provider.initialize()             │││  │
└──────────────────────────────────────────┼┼┼──┘
                                           │││
         ┌─────────────────────────────────┘││
         │        ┌─────────────────────────┘│
         │        │        ┌─────────────────┘
         │        │        │
    ┌────▼───┐ ┌─▼──────┐ ┌▼────────┐
    │Firebase│ │Supabase│ │ MongoDB │
    │Provider│ │Provider│ │Provider │
    └────────┘ └────────┘ └─────────┘
```

## Interface-Based Design

```
┌──────────────────────────────────────────────────────┐
│              Application Code                        │
│                                                      │
│  const db = await getDb();  ◄─────────────┐        │
│  await db.getDoc('users', id);             │        │
│                                             │        │
│  Works with ANY backend! ─────────────────┐│        │
└───────────────────────────────────────────┼┼────────┘
                                            ││
                      ┌─────────────────────┘│
                      │                      │
              ┌───────▼────────┐    ┌───────▼────────┐
              │   IDatabase    │    │  IAuthProvider │
              │  (Interface)   │    │  (Interface)   │
              └───────┬────────┘    └───────┬────────┘
                      │                      │
        ┌─────────────┴─────────────┐       │
        │                           │       │
┌───────▼─────────┐        ┌────────▼──────▼──┐
│ FirebaseDb      │        │ SupabaseDb        │
│ Adapter         │        │ Adapter           │
│                 │        │                   │
│ Implements      │        │ Implements        │
│ IDatabase       │        │ IDatabase         │
└─────────────────┘        └───────────────────┘
```

## Data Flow

### Read Operation

```
┌────────────┐
│ Component  │
└─────┬──────┘
      │ const db = await getDb();
      │ const user = await db.getDoc('users', 'id123');
      │
┌─────▼──────┐
│  Factory   │  Looks up provider in registry
└─────┬──────┘
      │
┌─────▼────────┐
│   Provider   │  Returns appropriate adapter
└─────┬────────┘
      │
┌─────▼────────┐
│   Adapter    │  Translates to backend-specific call
└─────┬────────┘
      │
┌─────▼────────┐
│   Firebase   │  Executes query
│      or      │
│   Supabase   │
└─────┬────────┘
      │
      ▼
   Result
      │
┌─────▼────────┐
│   Adapter    │  Converts types (Timestamp → Date)
└─────┬────────┘
      │
      ▼
┌────────────┐
│ Component  │  Receives data with Date objects
└────────────┘
```

### Write Operation

```
┌────────────┐
│ Component  │  Uses standard Date objects
└─────┬──────┘
      │ await db.setDoc('users', 'id', {
      │   createdAt: new Date(),
      │ });
      │
┌─────▼──────┐
│  Adapter   │  Converts Date → Timestamp (Firebase)
│            │  or Date → ISO String (Supabase)
└─────┬──────┘
      │
┌─────▼────────┐
│   Backend    │  Stores in native format
└──────────────┘
```

## Configuration System

```
┌──────────────────────────────────────────────┐
│         Environment Variable                 │
│  NEXT_PUBLIC_BACKEND_PROVIDER=firebase      │
└─────────────────┬────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│         Config Loader (Generic)              │
│                                              │
│  const CONFIG_LOADERS = {                   │
│    firebase: firebaseConfig,                │
│    supabase: supabaseConfig,                │
│  }                                           │
│                                              │
│  return CONFIG_LOADERS[provider]            │
└─────────────────┬────────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
┌────────▼────────┐ ┌──────▼──────────┐
│ Firebase Config │ │ Supabase Config │
│                 │ │                 │
│ getServerConfig │ │ getServerConfig │
│ getClientConfig │ │ getClientConfig │
└─────────────────┘ └─────────────────┘
```

## Backend Provider Lifecycle

```
┌─────────────────────────────────────────────────┐
│                  Application Start              │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│         First call to getAuth/getDb/etc         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│   Factory looks up provider in REGISTRY         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│   new FirebaseProvider() / SupabaseProvider()   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│         provider.initialize()                    │
│                                                  │
│  1. Fetch config from /api/config               │
│  2. Initialize SDK (Firebase/Supabase)          │
│  3. Set up client/server instances              │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│    Provider returns adapters (Auth/DB/Storage)   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│         Application uses services                │
└─────────────────────────────────────────────────┘
```

## Type Conversion Flow

```
Application Layer
────────────────────────────────────────────────
  {
    createdAt: Date,              ◄──┐
    lastLogin: Date                  │ Always uses
  }                                  │ standard types
────────────────────────────────────┼────────────
                                    │
Adapter Layer                       │
────────────────────────────────────┼────────────
                                    │
Firebase Adapter:                   │
  Date → Timestamp                  │ Automatic
  Timestamp → Date                  │ conversion
                                    │
Supabase Adapter:                   │
  Date → ISO String                 │
  ISO String → Date                 │
────────────────────────────────────┼────────────
                                    │
Backend Layer                       │
────────────────────────────────────▼────────────
Firebase: { createdAt: Timestamp }
Supabase: { createdAt: "2025-11-09T..." }
─────────────────────────────────────────────────
```

## Adding a New Backend (Visual)

```
Step 1: Create Provider
─────────────────────────
┌──────────────────────┐
│  MongoProvider.ts    │
│                      │
│  implements          │
│  IBackendProvider    │
└──────────────────────┘

Step 2: Create Config
─────────────────────────
┌──────────────────────┐
│  config.ts           │
│                      │
│  getServerConfig()   │
│  getClientConfig()   │
└──────────────────────┘

Step 3: Register (2 lines!)
─────────────────────────────────────
BACKEND_REGISTRY = {
  firebase: FirebaseProvider,
  supabase: SupabaseProvider,
  mongodb:  MongoProvider,      ◄─── Add here (line 1)
}

CONFIG_LOADERS = {
  firebase: firebaseConfig,
  supabase: supabaseConfig,
  mongodb:  mongoConfig,         ◄─── Add here (line 2)
}
─────────────────────────────────────

✅ Done! No other changes needed.
```

## File Organization

```
src/backend/
├── interfaces/          ◄─── Contracts (what every backend must do)
│   ├── IBackendProvider.ts
│   ├── IAuthProvider.ts
│   ├── IDatabase.ts
│   └── IStorage.ts
│
├── config/              ◄─── Generic config system
│   └── loader.ts             (no if/else!)
│
├── firebase/            ◄─── Firebase implementation
│   ├── FirebaseProvider.ts   (self-contained)
│   ├── config.ts             (Firebase-specific)
│   ├── *Adapter.ts           (implements interfaces)
│   └── index.ts
│
├── supabase/            ◄─── Supabase implementation
│   ├── SupabaseProvider.ts   (self-contained)
│   ├── config.ts             (Supabase-specific)
│   ├── *Adapter.ts           (implements interfaces)
│   └── index.ts
│
├── factory.ts           ◄─── Registry (ONLY 2 places to add backend)
├── types.ts             ◄─── Backend-agnostic models
└── index.ts             ◄─── Main exports
```

## Key Architecture Principles

```
┌─────────────────────────────────────────────────┐
│  1. Single Responsibility                       │
│     Each backend owns its initialization        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  2. Open/Closed                                 │
│     Open for extension (add backends)           │
│     Closed for modification (no code changes)   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  3. Dependency Inversion                        │
│     App depends on interfaces, not concrete     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  4. Interface Segregation                       │
│     Separate interfaces for Auth/DB/Storage     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  5. Don't Repeat Yourself (DRY)                │
│     Registry pattern eliminates duplication     │
└─────────────────────────────────────────────────┘
```

## Benefits Visualization

```
Code Duplication
Before: ████████████████ (High)
After:  ─                (None)

If/Else Statements
Before: ███████████████  (15+ locations)
After:  ─                (Zero)

Lines to Add Backend
Before: ██████████████   (Modify 10+ files)
After:  ██               (2 lines)

Type Safety
Before: ████████         (Partial)
After:  ████████████████ (Complete)

Maintainability
Before: ████████         (Scattered)
After:  ████████████████ (Single source of truth)
```

---

## Summary

This architecture achieves **true backend agnosticism** through:

✅ **Registry Pattern** - No if/else, just object lookup
✅ **Self-Contained Modules** - Each backend owns its lifecycle
✅ **Interface-Based Design** - Application depends on contracts
✅ **Automatic Type Handling** - Transparent conversions
✅ **Single Source of Truth** - All backends in one registry

**Result:** Switching backends = 1 environment variable change!
