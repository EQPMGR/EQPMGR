# Comprehensive Adapter & User Property Usage Map

**Generated:** 2025-08-09  
**Purpose:** Track all locations importing/calling getDb(), getServerDb(), db.* methods, user properties, and camelCase type usage for adapter elimination refactor

---

## 1. DATABASE ADAPTER INITIALIZATION CALLS

### 1.1 getDb() Calls (Client/Async Context)

| File | Line | Context | Imported As |
|------|------|---------|-------------|
| [src/context/auth-context.tsx](src/context/auth-context.tsx#L5) | 5, 99, 109, 118, 135, 302, 305, 337, 343, 374 | Multiple locations: user sync, profile updates, photo upload | `import { getDb } from '@/backend'` |
| [src/components/add-equipment-dialog.tsx](src/components/add-equipment-dialog.tsx#L122) | 122, 127 | Equipment creation dialogs | `import { getDb } from '@/backend'` |
| [src/components/add-wheelset-dialog.tsx](src/components/add-wheelset-dialog.tsx#L183) | 183 | Wheelset addition | `import { getDb } from '@/backend'` |
| [src/components/bike-fit-dialog.tsx](src/components/bike-fit-dialog.tsx#L110) | 110 | Bike fit data updates | `import { getDb } from '@/backend'` |
| [src/components/component-hotspot.tsx](src/components/component-hotspot.tsx#L29) | 29 | Component interaction | `import { getDb } from '@/backend'` |
| [src/components/edit-component-dialog.tsx](src/components/edit-component-dialog.tsx#L137) | 137 | Component editing | `import { getDb } from '@/backend'` |
| [src/components/equipment-list-page.tsx](src/components/equipment-list-page.tsx#L31) | 31, 122, 146, 286 | Equipment list operations, bike fetch | `import { getDb } from '@/backend'` |
| [src/components/open-work-orders.tsx](src/components/open-work-orders.tsx#L50) | 50 | Service order operations | `import { getDb } from '@/backend'` |
| [src/components/request-service-dialog.tsx](src/components/request-service-dialog.tsx#L51) | 51 | Service request creation | `import { getDb } from '@/backend'` |
| [src/components/wear-simulation.tsx](src/components/wear-simulation.tsx#L194) | 194 | Wear calculation updates | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/bottom-bracket-seeder.tsx](src/app/(app)/admin/bottom-bracket-seeder.tsx#L27) | 27 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/brake-rotor-seeder.tsx](src/app/(app)/admin/brake-rotor-seeder.tsx#L27) | 27 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/campagnolo-seeder.tsx](src/app/(app)/admin/campagnolo-seeder.tsx#L27) | 27 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/dropper-post-seeder.tsx](src/app/(app)/admin/dropper-post-seeder.tsx#L27) | 27 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/handlebar-seeder.tsx](src/app/(app)/admin/handlebar-seeder.tsx#L27) | 27 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/headset-seeder.tsx](src/app/(app)/admin/headset-seeder.tsx#L27) | 27 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/rear-shock-seeder.tsx](src/app/(app)/admin/rear-shock-seeder.tsx#L27) | 27 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/saddle-seeder.tsx](src/app/(app)/admin/saddle-seeder.tsx#L27) | 27 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/seatpost-seeder.tsx](src/app/(app)/admin/seatpost-seeder.tsx#L27) | 27 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/seeder.tsx](src/app/(app)/admin/seeder.tsx#L34) | 34 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/shimano-seeder.tsx](src/app/(app)/admin/shimano-seeder.tsx#L26) | 26 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/sram-seeder.tsx](src/app/(app)/admin/sram-seeder.tsx#L26) | 26 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/suspension-fork-seeder.tsx](src/app/(app)/admin/suspension-fork-seeder.tsx#L27) | 27 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/tires-seeder.tsx](src/app/(app)/admin/tires-seeder.tsx#L27) | 27 | Admin data seeding | `import { getDb } from '@/backend'` |
| [src/app/(app)/admin/vector-admin/page.tsx](src/app/(app)/admin/vector-admin/page.tsx#L21) | 21, 29 | Vector search admin page | `import { getDb } from '@/backend'` |
| [src/app/(app)/equipment/[id]/[system]/[componentId]/page.tsx](src/app/(app)/equipment/[id]/[system]/[componentId]/page.tsx#L48) | 48, 83 | Component detail pages | `import { getDb } from '@/backend'` |
| [src/app/(app)/equipment/[id]/[system]/page.tsx](src/app/(app)/equipment/[id]/[system]/page.tsx#L35) | 35 | System components view | `import { getDb } from '@/backend'` |
| [src/app/(app)/equipment/[id]/page.tsx](src/app/(app)/equipment/[id]/page.tsx#L110) | 110, 118, 128, 180 | Equipment detail pages | `import { getDb } from '@/backend'` |
| [src/hooks/useUserProfile.ts](src/hooks/useUserProfile.ts#L5) | 5, 22 | User profile hook (unused/dead code?) | `import { getDb } from '@/backend'` |

### 1.2 getServerDb() Calls (Server Actions)

| File | Line | Context |
|------|------|---------|
| [src/app/(app)/admin/add-bike-model/actions.ts](src/app/(app)/admin/add-bike-model/actions.ts#L65) | 65, 72 | Server action: add bike model |
| [src/app/(app)/admin/add-service-provider/actions.ts](src/app/(app)/admin/add-service-provider/actions.ts#L23) | 23 | Server action: add service provider |
| [src/app/(app)/admin/data-cleanup/actions.ts](src/app/(app)/admin/data-cleanup/actions.ts#L12) | 12 | Server action: cleanup data |
| [src/app/(app)/admin/find-duplicates/actions.ts](src/app/(app)/admin/find-duplicates/actions.ts#L22) | 22, 79 | Server action: find duplicates |
| [src/app/(app)/equipment/[id]/actions.ts](src/app/(app)/equipment/[id]/actions.ts#L37) | 37, 259, 307 | Server actions: equipment ops |
| [src/app/(app)/insurance/actions.ts](src/app/(app)/insurance/actions.ts#L113) | 113 | Server action: insurance |
| [src/app/(app)/service-providers/actions.ts](src/app/(app)/service-providers/actions.ts#L11) | 11, 34 | Server action: service orders |
| [src/app/(app)/settings/apps/actions.ts](src/app/(app)/settings/apps/actions.ts#L160) | 160, 249, 287, 362 | Server actions: Strava sync, settings |
| [src/app/api/debug/service-role-write/route.ts](src/app/api/debug/service-role-write/route.ts#L14) | 14 | API debug endpoint |
| [src/app/api/health/route.ts](src/app/api/health/route.ts#L9) | 9 | Health check endpoint |
| [src/lib/import-feedback-analytics.ts](src/lib/import-feedback-analytics.ts#L26) | 26 | Utility: analytics import |
| [src/services/components.ts](src/services/components.ts#L20) | 20 | Service: components |
| [src/services/duplicates.ts](src/services/duplicates.ts#L20) | 20 | Service: duplicate detection |
| [src/services/vector-search.ts](src/services/vector-search.ts#L24) | 24 | Service: vector search |

---

## 2. DATABASE ADAPTER METHOD CALLS

### 2.1 db.getDoc() Calls

| File | Line | Collection | Purpose |
|------|------|-----------|---------|
| [src/context/auth-context.tsx](src/context/auth-context.tsx#L103) | 103, 109, 135, 305, 343 | `app_users` | User sync on auth, profile fetch |
| [src/app/(app)/settings/apps/actions.ts](src/app/(app)/settings/apps/actions.ts#L164) | 164, 291 | `app_users` | Strava data fetch, user profile |
| [src/app/(app)/equipment/[id]/actions.ts](src/app/(app)/equipment/[id]/actions.ts#L41) | 41, 53, 59, 94, 349 | Mixed: `components`, `masterComponents`, subcollections | Component replacement logic |
| [src/app/(app)/admin/add-bike-model/actions.ts](src/app/(app)/admin/add-bike-model/actions.ts#L295) | 295, 304 | `masterComponents` | Bike model operations |
| [src/app/(app)/admin/add-service-provider/actions.ts](src/app/(app)/admin/add-service-provider/actions.ts#L25) | 25 | `serviceProviders` | Service provider fetch |
| [src/components/equipment-list-page.tsx](src/components/equipment-list-page.tsx#L146) | 146, 286 | `bikeModels`, `masterComponents` | Equipment data fetch |
| [src/app/api/health/route.ts](src/app/api/health/route.ts#L16) | 16 | `_health_check` | Health check |

### 2.2 db.updateDoc() Calls

| File | Line | Collection | Data Updated |
|------|------|-----------|---------------|
| [src/context/auth-context.tsx](src/context/auth-context.tsx#L118) | 118 | `app_users` | `lastLogin`, `email_verified` |
| [src/context/auth-context.tsx](src/context/auth-context.tsx#L302) | 302 | `app_users` | `displayName`, `phone`, `height`, `weight`, `shoeSize`, `birthdate` |
| [src/context/auth-context.tsx](src/context/auth-context.tsx#L337) | 337 | `app_users` | Preferences: `measurement_system`, `shoe_size_system`, `distance_unit`, `date_format` |
| [src/app/(app)/settings/apps/actions.ts](src/app/(app)/settings/apps/actions.ts#L91) | 91, 147 | `app_users` | Strava credentials, `strava: null` (disconnect) |
| [src/app/(app)/settings/apps/actions.ts](src/app/(app)/settings/apps/actions.ts#L372) | 372 | Equipment | `totalDistance`, `totalHours` increment |
| [src/app/(app)/insurance/actions.ts](src/app/(app)/insurance/actions.ts#L114) | 114 | `counters` | `insuranceApplications` count |
| [src/app/api/debug/service-role-write/route.ts](src/app/api/debug/service-role-write/route.ts#L15) | 15 | `app_users` | `strava` (debug endpoint) |

### 2.3 db.getDocs() Calls

| File | Line | Collection | Query Purpose |
|------|------|-----------|----------------|
| [src/app/(app)/admin/data-cleanup/actions.ts](src/app/(app)/admin/data-cleanup/actions.ts#L27) | 27 | `masterComponents` | Find components without embeddings |
| [src/app/(app)/admin/find-duplicates/actions.ts](src/app/(app)/admin/find-duplicates/actions.ts#L31) | 31 | `app_users` | Batch duplicate detection |
| [src/app/(app)/admin/add-bike-model/actions.ts](src/app/(app)/admin/add-bike-model/actions.ts#L304) | 304 | `components` | Find component instances |
| [src/lib/master-component-utils.ts](src/lib/master-component-utils.ts#L40) | 40, 65 | `masterComponents` | Slug lookup, component find |
| [src/lib/import-feedback-analytics.ts](src/lib/import-feedback-analytics.ts#L27) | 27 | `importTextFeedback` | Recent feedback fetch |

### 2.4 db.setDoc() Calls

| File | Line | Collection | Data |
|------|------|-----------|------|
| [src/context/auth-context.tsx](src/context/auth-context.tsx#L374) | 374 | `app_users` | `{ photoURL: newPhotoURL }` (merge) |
| [src/app/(app)/admin/add-bike-model/actions.ts](src/app/(app)/admin/add-bike-model/actions.ts#L261) | 261 | `bikeModelComponents` | Bike model component data |
| [src/app/(app)/admin/add-service-provider/actions.ts](src/app/(app)/admin/add-service-provider/actions.ts#L40) | 40 | `serviceProviders` | Service provider data |
| [src/app/(app)/admin/find-duplicates/actions.ts](src/app/(app)/admin/find-duplicates/actions.ts#L80) | 80 | `ignoredDuplicates` | Mark duplicates ignored |
| [src/app/(app)/service-providers/actions.ts](src/app/(app)/service-providers/actions.ts#L50) | 50 | `workOrders` | New work order |

### 2.5 db.getSubDocs() / db.getSubDoc() Calls (Subcollections)

| File | Line | Path | Purpose |
|------|------|------|---------|
| [src/app/(app)/settings/apps/actions.ts](src/app/(app)/settings/apps/actions.ts#L252) | 252 | `app_users/{userId}/equipment` | Fetch user equipment |
| [src/app/(app)/admin/find-duplicates/actions.ts](src/app/(app)/admin/find-duplicates/actions.ts#L31) | 31 | `app_users/{userId}/equipment` | Subcollection equipment scan |
| [src/app/(app)/equipment/[id]/actions.ts](src/app/(app)/equipment/[id]/actions.ts#L41) | 41, 59 | `app_users/{userId}/equipment/{equipId}/components` | Component operations |

---

## 3. USER PROPERTY REFERENCES

### 3.1 Properties Accessed from `authUser` or `currentUser`

| Property | Files | Line Examples | Type | Purpose |
|----------|-------|---|------|---------|
| `uid` | auth-context, equipment-list-page, user-nav, many components | [auth-context.tsx#L33](src/context/auth-context.tsx#L33) | string | User ID for database queries |
| `email` | auth-context, user-nav, equipment-list-page, request-service | [auth-context.tsx#L34](src/context/auth-context.tsx#L34) | string | Display name fallback, service requests |
| `emailVerified` | auth-context (multiple) | [auth-context.tsx#L35](src/context/auth-context.tsx#L35), [auth-context.tsx#L109](src/context/auth-context.tsx#L109), [auth-context.tsx#L172](src/context/auth-context.tsx#L172) | boolean | Email verification check, sync to DB |
| `displayName` | auth-context, user-nav, request-service, components | [auth-context.tsx#L36](src/context/auth-context.tsx#L36), [user-nav.tsx#L52](src/components/user-nav.tsx#L52) | string | Display in UI, work order creation |
| `photoURL` | auth-context, user-nav, components | [auth-context.tsx#L38](src/context/auth-context.tsx#L38), [user-nav.tsx#L42](src/components/user-nav.tsx#L42) | string | Avatar display |
| `getIdToken()` | auth-context | [auth-context.tsx#L47](src/context/auth-context.tsx#L47), [auth-context.tsx#L71](src/context/auth-context.tsx#L71) | function | Server-side token verification |

### 3.2 Properties Accessed from Database `app_users` Document

#### In [src/context/auth-context.tsx](src/context/auth-context.tsx):

| Property | Lines | Access Pattern | Usage |
|----------|-------|---|------|
| `displayName` | 36, 302 | `data.displayName` or `userDocSnap.data.displayName` | Profile display, update |
| `phone` | 43, 302 | `data.phone` | Profile info |
| `photoURL` | 38, 302, 374 | `data.photoURL` | Avatar |
| `height` | 43, 302 | `data.height` | User measurements |
| `weight` | 44, 302 | `data.weight` | User measurements |
| `shoeSize` | 45, 302 | `data.shoeSize` | Shoe fit info |
| `birthdate` | 46, 302 | `data.birthdate` | User profile |
| `measurementSystem` | 42, 328 | `data.measurementSystem` | Preference, mapped to `measurement_system` |
| `shoeSizeSystem` | 42, 329 | `data.shoeSizeSystem` | Preference, mapped to `shoe_size_system` |
| `distanceUnit` | 42, 330 | `data.distanceUnit` | Preference, mapped to `distance_unit` |
| `dateFormat` | 42, 331 | `data.dateFormat` | Preference, mapped to `date_format` |
| `email_verified` | 109 | `userDocSnap.data.email_verified` | **snake_case in DB** - sync from auth |
| `lastLogin` | 106 | Update payload | **camelCase in app** - update to DB |
| `strava` | 372, 375 | `userData.strava` | OAuth token data (accessToken, refreshToken, expiresAt, processedActivities) |

#### In [src/app/(app)/settings/apps/actions.ts](src/app/(app)/settings/apps/actions.ts):

| Property | Lines | Context |
|----------|-------|---------|
| `strava` | 27, 85, 86, 87, 88, 164, 291 | Strava OAuth: `{ accessToken, refreshToken, expiresAt, processedActivities }` |
| `displayName` | 22579 | Work order: `userName: user.displayName` |
| `email` | 22581 | Work order: `userEmail: user.email` |

#### In [src/components/user-nav.tsx](src/components/user-nav.tsx):

| Property | Lines |
|----------|-------|
| `photoURL` | 42 |
| `displayName` | 52 |
| `email` | 54 |

#### In [src/components/request-service-dialog.tsx](src/components/request-service-dialog.tsx):

| Property | Lines |
|----------|-------|
| `uid` | 122 |
| `displayName` | 123 |
| `email` | 124 |

### 3.3 Properties NOT Found But Likely Needed (Adapter Conversion)

These properties exist in camelCase but may have snake_case equivalents in DB:

| camelCase | snake_case (DB) | Usage |
|-----------|-----------------|-------|
| displayName | display_name | User profile |
| photoURL | photo_url | Avatar |
| emailVerified | email_verified | Auth status |
| lastLogin | last_login | User tracking |
| measurementSystem | measurement_system | Preference |
| shoeSizeSystem | shoe_size_system | Preference |
| distanceUnit | distance_unit | Preference |
| dateFormat | date_format | Preference |

---

## 4. TYPE DEFINITIONS WITH CAMELCASE PROPERTIES

### 4.1 src/backend/types.ts - UserProfile (Backend-agnostic)

```typescript
export interface UserProfile {
  uid: string;
  email: string | null;
  emailVerified: boolean;                    // ← camelCase
  displayName: string | null;                // ← camelCase
  phone?: string | null;
  photoURL: string | null;                   // ← camelCase
  height?: number;
  weight?: number;
  shoeSize?: number;                         // ← camelCase
  birthdate?: Date | null;
  measurementSystem: 'metric' | 'imperial';  // ← camelCase
  shoeSizeSystem: 'us-womens' | 'us-mens' | 'uk' | 'eu'; // ← camelCase
  distanceUnit: 'km' | 'miles';              // ← camelCase
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD'; // ← camelCase
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}
```

### 4.2 src/backend/types.ts - UserDocument (DB Layer)

```typescript
export interface UserDocument {
  displayName?: string;                       // ← camelCase in app
  phone?: string;
  photoURL?: string;                          // ← camelCase in app
  email_verified?: boolean;                   // ← snake_case in DB
  height?: number;
  weight?: number;
  shoeSize?: number;                          // ← camelCase in app
  birthdate?: Date;
  measurementSystem?: 'metric' | 'imperial';  // ← camelCase in app
  shoeSizeSystem?: 'us-womens' | 'us-mens' | 'uk' | 'eu'; // ← camelCase
  distanceUnit?: 'km' | 'miles';              // ← camelCase in app
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD'; // ← camelCase
  createdAt?: Date;                           // ← camelCase in app
  lastLogin?: Date;                           // ← camelCase in app
}
```

### 4.3 src/lib/types.ts - Other Major Types (All use camelCase)

| Type | camelCase Properties | Database Mapping |
|------|---|---|
| Equipment | purchaseDate, purchasePrice, totalDistance, totalHours, modelYear, serialNumber, frameSize, shoeSizeSystem, masterBikeModelId, imageUrl, fitData, wheelsets, archivedComponents, associatedEquipmentIds | Adapter converts to snake_case |
| UserComponent | masterComponentId, wearPercentage, lastServiceDate, purchaseDate, installedAtDistance, currentDistance, expectedReplacementKm, isActive, replacementCount, installedAt, wheelsetId, replacedByUser, parentUserComponentId | Adapter converts |
| MasterComponent | recommendedIntervalKm, replacementIntervalKm, observedIntervalKmAvg, observedIntervalKmCount, observedIntervalKmMedian | Adapter converts |
| BikeFitData | saddleHeight, saddleHeightOverBars, saddleToHandlebarReach, saddleAngle, saddleForeAft, saddleBrandModel, stemLength, stemAngle, handlebarBrandModel, handlebarWidth, handlebarAngle, handlebarExtension, brakeLeverPosition, crankLength, hasAeroBars, cleatPosition | Adapter converts |
| ServiceProvider | shopName, logoUrl, averageRating, ratingCount, postalCode, dropOff, valetService, geohash | Adapter converts |
| WorkOrder | userId, userName, userPhone, userEmail, serviceProviderId, providerName, equipmentId, equipmentName, equipmentBrand, equipmentModel, serviceType, userConsent | Adapter converts |

---

## 5. ADAPTER CONVERSION MAPPING (SupabaseDbAdapter)

### Field Mapping Reference

From [src/backend/supabase/SupabaseDbAdapter.ts](src/backend/supabase/SupabaseDbAdapter.ts):

```typescript
// app_users collection mappings
const APP_USERS_FIELDS = [
  'id', 'uid', 'email', 'email_verified', 'display_name', 'phone', 'photo_url', 'avatar_url',
  'height', 'weight', 'shoe_size', 'birthdate', 'measurement_system', 'shoe_size_system',
  'distance_unit', 'date_format', 'created_at', 'last_login', 'strava'
];

// Conversion examples from processFieldValues():
// Field 'displayName' → DB 'display_name'
// Field 'photoURL' → DB 'photo_url'
// Field 'emailVerified' → DB 'email_verified'
// Field 'lastLogin' → DB 'last_login'
// Field 'shoeSize' → DB 'shoe_size'
// Field 'measurementSystem' → DB 'measurement_system'
// Field 'shoeSizeSystem' → DB 'shoe_size_system'
// Field 'distanceUnit' → DB 'distance_unit'
// Field 'dateFormat' → DB 'date_format'
// Field 'createdAt' → DB 'created_at'
```

### Date Field Handling

Lines 340-342 in SupabaseDbAdapter.ts:
```typescript
// Avoid converting format keys like date_format to actual dates
const isDateField = (lk.endsWith('_at') || lk.endsWith('_date') || lk.includes('birth')) 
  && !lk.includes('date_format');
```

Affected: `created_at`, `updated_at`, `last_login`, `birthdate` are treated as Date objects.

---

## 6. STRAVA INTEGRATION - SPECIAL CASE

### Strava Data Structure in app_users.strava

Location: [src/app/(app)/settings/apps/actions.ts](src/app/(app)/settings/apps/actions.ts#L22-L88)

Properties accessed/stored:
```typescript
{
  accessToken: string;          // OAuth access token
  refreshToken: string;         // OAuth refresh token
  expiresAt: number;           // Unix timestamp when token expires
  processedActivities?: string[];  // Array of activity IDs already synced
}
```

Functions manipulating Strava data:
- `ensureStravaTokenIsValid()` - Line 22: Validates and refreshes token
- `fetchRecentStravaActivities()` - Line 159: Fetches and syncs activities
- `checkStravaConnection()` - Line 280: Verifies connection validity
- `clearStravaConnection()` - Line 140: Disconnects Strava account
- `assignStravaActivityToAction()` - Line 362: Assigns activity to equipment

Database updates to strava field:
- Line 91: Disconnect: `{ strava: null }`
- Line 147: Clear on token failure: `{ strava: null }`
- Line 88: Refresh: Update `accessToken`, `refreshToken`, `expiresAt`

---

## 7. FOCUS AREAS FOR REFACTOR

### 7.1 auth-context.tsx (CRITICAL)

**Lines:** 99-160, 231, 302-320, 337-357, 365-374

**Current Operations:**
- Line 103: `db.getDoc('app_users', authUser.uid)` - sync user on login
- Line 109: Check `email_verified` field → update if mismatch
- Line 118: `db.updateDoc('app_users', authUser.uid, { lastLogin, email_verified })`
- Line 302: Profile info update with camelCase fields
- Line 337: Preference update with field name mapping
- Line 374: Photo URL update via `db.setDoc()`

**Properties Accessed:**
- User auth properties: `uid`, `email`, `emailVerified`, `displayName`, `photoURL`
- User doc properties: `displayName`, `phone`, `height`, `weight`, `shoeSize`, `birthdate`, all preferences, `email_verified`
- Preference mapping: `measurementSystem` → `measurement_system`, etc.

**Action Required:**
- Change all db calls to use snake_case fields
- Update UserProfile/UserDocument types
- Update field name mappings

### 7.2 settings/apps/actions.ts (CRITICAL - Strava)

**Lines:** 91, 147, 160-195, 249-257, 287-295, 362-379

**Current Operations:**
- Line 164: `db.getDoc('app_users', userId)` - fetch Strava data
- Line 91, 147: `db.updateDoc('app_users', userId, { strava: ... })` 
- Line 372: `db.increment()` for totalDistance/totalHours
- Line 375: Fetch user doc after update

**Strava-Specific:**
- Line 27: Destructure `{ accessToken, refreshToken, expiresAt, processedActivities }` from userData.strava
- Line 85-88: Reconstruct with `data.access_token`, `data.refresh_token`, `data.expires_at` from Strava API response

**Action Required:**
- All db operations stay same structure but adapter does conversion
- Verify Strava data field names stay consistent

### 7.3 Components Accessing user.uid, user.email, etc.

**Key Files:**
- [src/components/user-nav.tsx](src/components/user-nav.tsx#L42-L54): Avatar display
- [src/components/equipment-list-page.tsx](src/components/equipment-list-page.tsx#L31): Equipment queries
- [src/components/request-service-dialog.tsx](src/components/request-service-dialog.tsx#L51): Service orders
- [src/app/(app)/equipment/[id]/page.tsx](src/app/(app)/equipment/[id]/page.tsx#L110): Equipment detail

**Action Required:**
- No changes needed if using adapter (automatic conversion)
- If eliminating adapter, no field name changes (only app layer)

### 7.4 Server Functions in actions.ts Files

**Files:**
- `admin/add-bike-model/actions.ts`
- `admin/add-service-provider/actions.ts`
- `admin/find-duplicates/actions.ts`
- `equipment/[id]/actions.ts`
- `insurance/actions.ts`
- `service-providers/actions.ts`

**Current Pattern:**
```typescript
const db = await getServerDb();
const snap = await db.getDoc('collection', id);
await db.updateDoc('collection', id, { field: value });
```

**Action Required:**
- Change all field names from camelCase to snake_case
- Or keep adapter and no changes needed

---

## 8. SUMMARY STATISTICS

| Metric | Count |
|--------|-------|
| Files importing `getDb()` | 24 |
| Files importing `getServerDb()` | 14 |
| `db.getDoc()` calls | 12+ |
| `db.updateDoc()` calls | 8+ |
| `db.getDocs()` calls | 5+ |
| `db.setDoc()` calls | 5+ |
| User properties accessed | 15+ |
| Types with camelCase properties | 10+ |
| Server action files | 8 |
| Components accessing user data | 8+ |

---

## 9. RECOMMENDATIONS FOR ELIMINATION STRATEGY

### Option 1: Keep Adapter, Update Types Only
- ✅ Minimal code changes in components/actions
- ❌ Adapter layer adds complexity
- Timeline: 2-3 days

### Option 2: Eliminate Adapter, Go Full snake_case
- ✅ Simpler architecture
- ❌ Major refactor needed across all files
- Changes needed:
  1. Update `src/lib/types.ts` - convert UserProfile/UserDocument to snake_case
  2. Update `src/context/auth-context.tsx` - all property access
  3. Update `src/app/(app)/settings/apps/actions.ts` - Strava handling
  4. Update all server actions (8 files)
  5. Update components (8 files)
  6. Remove `SupabaseDbAdapter.ts` or make it pass-through only
- Timeline: 4-5 days

### Option 3: Hybrid Approach
- Keep adapter but simplify - no field name mapping
- Update types to match DB schema exactly
- Timeline: 2 days

**Recommended:** Option 2 (full elimination) for long-term maintainability and clarity

---

## 10. TESTING CHECKLIST

After refactor, verify:

- [ ] User login/logout works
- [ ] Profile info updates save correctly
- [ ] Preferences (measurement system, etc.) persist
- [ ] Email verification flow works
- [ ] Photo upload works
- [ ] Strava connection works
- [ ] Activity sync works
- [ ] Equipment CRUD operations work
- [ ] Work orders can be created
- [ ] Service provider queries work
- [ ] Admin seeders work
- [ ] Data integrity - no lost user data

---

**End of Map**
