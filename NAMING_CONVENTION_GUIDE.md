# Naming Convention Architecture Guide

## Overview

EQPMGR follows an enterprise architectural pattern with **clean layer separation** for database and application naming conventions.

| Layer | Naming Convention | Examples | Reason |
|-------|-------------------|----------|--------|
| **Database** (PostgreSQL) | `snake_case` | `user_id`, `created_at`, `wear_percentage` | SQL Standard (portability, readability) |
| **Application** (TypeScript) | `camelCase` | `userId`, `createdAt`, `wearPercentage` | JavaScript Standard (convention, IDE support) |

## How It Works

### The Automatic Bridge

The `SupabaseDbAdapter` automatically converts between naming conventions:

```
Application Code (camelCase)
         ↓
    [Adapter Layer]
         ↓
Database (snake_case)
```

### Reading Data (snake_case → camelCase)

```typescript
// Database returns: { user_id: "123", created_at: "2024-01-01" }
// Adapter converts to: { userId: "123", createdAt: "2024-01-01" }
// Application gets:
const workOrder = await db.getDoc('workOrders', orderId);
console.log(workOrder.userId);        // ✓ camelCase (natural in JS)
console.log(workOrder.user_id);       // ✗ undefined
```

### Writing Data (camelCase → snake_case)

```typescript
// Application writes:
await db.setDoc('workOrders', orderId, {
  userId: "123",           // camelCase
  createdAt: new Date()    // camelCase
});

// Adapter converts:
// INSERT INTO work_orders (user_id, created_at) VALUES (...)
```

### Querying Data

```typescript
// Application queries using camelCase:
const orders = await db.getDocs('workOrders', [
  { type: 'where', field: 'userId', op: '==', value: user.uid }
]);

// Adapter automatically converts field name:
// SELECT * FROM work_orders WHERE user_id = ...
```

## Property Mapping Reference

### Equipment
```
userId              → user_id
purchaseDate        → purchase_date
purchasePrice       → purchase_price
totalDistance       → total_distance
totalHours          → total_hours
modelYear           → model_year
serialNumber        → serial_number
frameSize           → frame_size
imageUrl            → image_url
maintenanceLog      → maintenance_log
archivedComponents  → archived_components
fitData             → fit_data
associatedEquipmentIds → associated_equipment_ids
```

### Component
```
masterComponentId    → master_component_id
userComponentId      → user_component_id
parentUserComponentId → parent_user_component_id
wearPercentage       → wear_percentage
lastServiceDate      → last_service_date
purchaseDate         → purchase_date
wheelsetId           → wheelset_id
```

### WorkOrder
```
userId                → user_id
userName              → user_name
userPhone             → user_phone
userEmail             → user_email
serviceProviderId     → service_provider_id
providerName          → provider_name
equipmentId           → equipment_id
equipmentName         → equipment_name
equipmentBrand        → equipment_brand
equipmentModel        → equipment_model
serviceType           → service_type
createdAt             → created_at
fitData               → fit_data
userConsent           → user_consent
consentGiven          → consent_given (nested)
```

## Implementation Details

### Conversion Functions

Located in `src/backend/supabase/SupabaseDbAdapter.ts`:

- `snakeToCamel(str: string)` - Convert snake_case → camelCase
- `camelToSnake(str: string)` - Convert camelCase → snake_case
- `convertKeysToCamelCase<T>(obj)` - Recursively convert object keys (used on read)
- `processFieldValues(data)` - Recursively convert + validate (used on write)

### When Conversion Happens

| Operation | Input | Output |
|-----------|-------|--------|
| `getDoc()` | snake_case from DB | camelCase object |
| `getDocs()` | snake_case from DB | camelCase objects |
| `setDoc()` | camelCase object | snake_case for DB |
| `addDoc()` | camelCase object | snake_case for DB |
| `updateDoc()` | camelCase object | snake_case for DB |
| Query field names | camelCase | snake_case for DB |

## Why This Pattern?

### Benefits

✅ **Database Portability** - PostgreSQL uses snake_case by convention; easy to migrate or query

✅ **JavaScript Idioms** - Application code follows natural JavaScript camelCase conventions

✅ **Single Point of Conversion** - All naming transformations happen in exactly one place

✅ **Scalability** - Easy to add new ORMs or database layers without changing application code

✅ **Type Safety** - TypeScript catches typos in property names at compile time

✅ **Zero Runtime Overhead** - Conversion only happens when data crosses the layer boundary

### Enterprise Precedent

This pattern is used by professional systems:
- **Django ORM** - Python camelCase ↔ SQL snake_case
- **TypeORM** - TypeScript camelCase ↔ SQL snake_case
- **Prisma** - JavaScript/TypeScript with custom column mappings
- **SQLAlchemy** - Python naming conversion layer

## Developer Guidelines

### ✅ DO

- Access properties using **camelCase** in application code: `user.userId`
- Define query constraints using **camelCase**: `{ field: 'userId' }`
- Reference interface properties using **camelCase**: `Equipment['purchaseDate']`

### ❌ DON'T

- Try to access snake_case properties in application code: `user.user_id` will be undefined
- Manually convert naming - the adapter does this automatically
- Mix snake_case and camelCase in the same component

### In Database Migrations

- Use **snake_case** for all column names
- Example: `CREATE TABLE equipment (user_id UUID, purchase_date DATE)`

## Adding New Properties

### When Adding a New Field

1. **Add to TypeScript interface** using camelCase:
   ```typescript
   export interface Equipment {
     // ...
     serviceSchedule?: string;  // camelCase
   }
   ```

2. **Add to database migration** using snake_case:
   ```sql
   ALTER TABLE equipment ADD COLUMN service_schedule TEXT;
   ```

3. **Done!** The adapter handles conversion automatically

The naming bridge ensures consistency without requiring manual effort.

## Troubleshooting

### "Property is undefined"
If `data.userId` is undefined but you know the data exists:
- Double-check you're accessing **camelCase** property names
- Verify the database column exists in snake_case in the schema
- Check that the adapter converter is being called (should be automatic)

### "Invalid field name" error in queries
If you get "column does not exist" errors:
- Ensure query field names are in **camelCase** in your code
- The adapter automatically converts them to snake_case
- Don't try to manually convert field names in queries

### "Type mismatch" errors
- Always use the TypeScript interfaces from `src/lib/types.ts`
- Don't create inline types with snake_case properties - use the official interfaces
- TypeScript will enforce camelCase naming automatically

## References

- **Database Schema**: `supabase/migrations/`
- **Type Definitions**: `src/lib/types.ts`
- **Adapter Implementation**: `src/backend/supabase/SupabaseDbAdapter.ts`
- **Configuration**: `.env` (database URLs and keys)

---

**Last Updated**: March 25, 2026  
**Architecture**: Enterprise Layer Separation with Automatic Naming Bridge
