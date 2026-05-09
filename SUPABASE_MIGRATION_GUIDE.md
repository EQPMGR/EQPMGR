# Supabase vs Firestore Migration Notes

## Critical Differences

### Database Structure

| Aspect | Firebase Firestore | Supabase PostgreSQL |
|--------|-------------------|-------------------|
| Collections | Nested subcollections | Flattened tables |
| Example | `users/{uid}/equipment/{id}` | `users`, `equipment` tables |
| Relationships | Document references | Foreign keys (user_id, equipment_id) |
| Paths | `path/to/collection` | Table names only |

### API Calls - Old vs New

#### Query All Equipment by User

**Old (Firestore):**
```typescript
db.getDocsFromSubcollection<Equipment>('app_users/${uid}', 'equipment')
// ERROR: Method doesn't exist
```

**New (Supabase):**
```typescript
db.getDocs<Equipment>(
  'equipment',
  { type: 'where', field: 'user_id', op: '==', value: uid }
)
```

#### Query Components for Equipment

**Old (Firestore):**
```typescript
db.getDocsFromSubcollection<UserComponent>(
  `app_users/${uid}/equipment/${equipmentId}`,
  'components'
)
// ERROR: Method doesn't exist
```

**New (Supabase):**
```typescript
db.getDocs<UserComponent>(
  'components',
  { type: 'where', field: 'equipment_id', op: '==', value: equipmentId }
)
```

#### Get Single Document

**Old (Firestore):**
```typescript
db.getDocFromSubcollection<Equipment>(`app_users/${uid}`, 'equipment', equipmentId)
// ERROR: Method doesn't exist
```

**New (Supabase):**
```typescript
db.getDoc<Equipment>('equipment', equipmentId)
// Supabase queries by primary key directly
```

#### Delete Operations

**Old (Firestore):**
```typescript
batch.deleteInSubcollection(`app_users/${uid}`, 'equipment', equipmentId)
// ERROR: Method doesn't exist
```

**New (Supabase):**
```typescript
batch.delete('equipment', equipmentId)
// Just specify table and ID
```

## IDatabase Interface - Valid Methods

✅ **Available:**
- `getDoc(collection, docId)` - Single doc by ID
- `getDocs(collection, ...constraints)` - Multiple docs with filters
- `getSubDoc(parent, parentId, subCollection, subDocId)` - Single subdoc (rarely used)
- `getSubDocs(parent, parentId, subCollection, ...constraints)` - Multiple subdocs

❌ **NOT Available:**
- `getDocsFromSubcollection()` - Does not exist
- `getDocFromSubcollection()` - Does not exist

## Foreign Key Mapping

Always query using the foreign key field in the child table:

```
users table
  └─ id (primary key)
  
equipment table
  └─ id (primary key)
  └─ user_id (foreign key) ← Query here to get equipment for a user

components table
  └─ id (primary key)
  └─ equipment_id (foreign key) ← Query here to get components for equipment
  └─ parent_component_id (foreign key) ← Query here for nested components
```

## Query Constraint Patterns

### Single WHERE clause
```typescript
db.getDocs('equipment', 
  { type: 'where', field: 'user_id', op: '==', value: uid }
)
```

### Multiple WHERE clauses (AND)
```typescript
db.getDocs('components',
  { type: 'where', field: 'equipment_id', op: '==', value: equipmentId },
  { type: 'where', field: 'parent_user_component_id', op: '==', value: componentId }
)
```

### With ordering
```typescript
db.getDocs('components',
  { type: 'where', field: 'equipment_id', op: '==', value: equipmentId },
  { type: 'orderBy', field: 'created_at', direction: 'desc' }
)
```

### With limit
```typescript
db.getDocs('equipment',
  { type: 'where', field: 'user_id', op: '==', value: uid },
  { type: 'limit', value: 10 }
)
```

## Naming Convention Reminder

Application code uses **camelCase** for all field names:
```typescript
{ type: 'where', field: 'user_id', op: '==', value: uid }
//                ↑ Field names are snake_case in queries
//                The adapter converts this to snake_case for the database query
```

The SupabaseDbAdapter automatically:
- Converts camelCase query fields → snake_case for database
- Converts snake_case results → camelCase for application code

---

**Last Updated:** March 27, 2026  
**Status:** Migration complete, all tests passing
