# Backend Refactoring Examples

This document shows real-world examples of how to migrate from Firebase-specific code to the backend abstraction layer.

## Table of Contents
- [Server Actions](#server-actions)
- [Client Components](#client-components)
- [Real-time Subscriptions](#real-time-subscriptions)
- [Batch Operations](#batch-operations)
- [Common Patterns](#common-patterns)

---

## Server Actions

### Before: Direct Firebase Admin Usage

```typescript
'use server';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import type { UserComponent } from '@/lib/types';

export async function replaceUserComponentAction({
    userId,
    equipmentId,
    userComponentIdToReplace,
}: {
    userId: string;
    equipmentId: string;
    userComponentIdToReplace: string;
}) {
    // ❌ Direct Firebase Admin usage
    const batch = adminDb.batch();

    // ❌ Firebase-specific document references
    const componentRef = adminDb.doc(`users/${userId}/equipment/${equipmentId}/components/${userComponentIdToReplace}`);
    const componentSnap = await componentRef.get();

    if (!componentSnap.exists) {
        throw new Error('Component not found');
    }

    const componentData = componentSnap.data() as UserComponent;

    // ❌ Firebase-specific batch operations
    batch.update(equipmentRef, {
        archivedComponents: FieldValue.arrayUnion(archivedComponent),
        maintenanceLog: FieldValue.arrayUnion({
            ...newLogEntry,
            date: Timestamp.fromDate(newLogEntry.date), // ❌ Manual timestamp conversion
        })
    });

    batch.set(componentRef, cleanData);
    await batch.commit();
}
```

### After: Backend Abstraction

```typescript
'use server';

import { getServerDb } from '@/backend';
import type { UserComponent } from '@/backend/types';

export async function replaceUserComponentAction({
    userId,
    equipmentId,
    userComponentIdToReplace,
}: {
    userId: string;
    equipmentId: string;
    userComponentIdToReplace: string;
}) {
    // ✅ Get backend database (works with any backend)
    const db = await getServerDb();

    // ✅ Use abstracted batch operations
    const batch = db.batch();

    // ✅ Use abstracted document reads
    const componentSnap = await db.getSubDoc<UserComponent>(
        'users',
        userId,
        'equipment',
        equipmentId,
        'components',
        userComponentIdToReplace
    );

    if (!componentSnap.exists) {
        throw new Error('Component not found');
    }

    const componentData = componentSnap.data!;

    // ✅ Use abstracted field values (no manual conversion needed!)
    batch.update(`users/${userId}/equipment/${equipmentId}`, equipmentId, {
        archivedComponents: db.arrayUnion(archivedComponent),
        maintenanceLog: db.arrayUnion({
            ...newLogEntry,
            date: newLogEntry.date, // ✅ Date objects work directly
        })
    });

    batch.set('users', userId, 'equipment', equipmentId, 'components', userComponentIdToReplace, cleanData);
    await batch.commit();
}
```

**Key Changes:**
1. Replace `adminDb` → `getServerDb()`
2. Use abstracted query methods
3. No manual timestamp conversions (handled automatically)
4. Backend-agnostic code

---

## Client Components

### Before: Direct Firebase Client Usage

```typescript
'use client';

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';

export function MyComponent() {
    async function updateUser(userId: string, data: any) {
        const { db } = await getFirebaseServices();

        // ❌ Direct Firestore operations
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            ...data,
            lastUpdated: serverTimestamp(), // ❌ Firebase-specific
        });
    }
}
```

### After: Backend Abstraction

```typescript
'use client';

import { getDb } from '@/backend';

export function MyComponent() {
    async function updateUser(userId: string, data: any) {
        const db = await getDb();

        // ✅ Backend-agnostic operations
        await db.updateDoc('users', userId, {
            ...data,
            lastUpdated: new Date(), // ✅ Standard Date object
        });
    }
}
```

---

## Real-time Subscriptions

### Before: Firestore onSnapshot

```typescript
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';

useEffect(() => {
    const setupListener = async () => {
        const { db } = await getFirebaseServices();

        // ❌ Firebase-specific query building
        const q = query(
            collection(db, 'workOrders'),
            where('userId', '==', userId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setWorkOrders(orders);
        });

        return unsubscribe;
    };

    setupListener();
}, [userId]);
```

### After: Backend Abstraction

```typescript
import { getDb } from '@/backend';

useEffect(() => {
    const setupListener = async () => {
        const db = await getDb();

        // ✅ Backend-agnostic query building
        const unsubscribe = db.onSnapshotQuery(
            'workOrders',
            (snapshot) => {
                const orders = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data
                }));
                setWorkOrders(orders);
            },
            (error) => console.error('Subscription error:', error),
            { type: 'where', field: 'userId', op: '==', value: userId }
        );

        return unsubscribe;
    };

    const cleanup = setupListener();
    return () => cleanup.then(unsub => unsub());
}, [userId]);
```

---

## Batch Operations

### Before: Firebase Batch

```typescript
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';

async function batchUpdate(updates: any[]) {
    const { db } = await getFirebaseServices();
    const batch = writeBatch(db);

    updates.forEach(update => {
        const docRef = doc(db, 'users', update.id);
        batch.update(docRef, {
            ...update.data,
            updatedAt: serverTimestamp()
        });
    });

    await batch.commit();
}
```

### After: Backend Abstraction

```typescript
import { getDb } from '@/backend';

async function batchUpdate(updates: any[]) {
    const db = await getDb();
    const batch = db.batch();

    updates.forEach(update => {
        batch.update('users', update.id, {
            ...update.data,
            updatedAt: new Date()
        });
    });

    await batch.commit();
}
```

---

## Common Patterns

### Pattern 1: Document Reads

```typescript
// ❌ Before
const { db } = await getFirebaseServices();
const docRef = doc(db, 'users', userId);
const docSnap = await getDoc(docRef);
if (docSnap.exists()) {
    const data = docSnap.data();
}

// ✅ After
const db = await getDb();
const docSnap = await db.getDoc('users', userId);
if (docSnap.exists) {
    const data = docSnap.data;
}
```

### Pattern 2: Collection Queries

```typescript
// ❌ Before
const { db } = await getFirebaseServices();
const q = query(
    collection(db, 'equipment'),
    where('userId', '==', userId),
    orderBy('purchaseDate', 'desc'),
    limit(10)
);
const snapshot = await getDocs(q);

// ✅ After
const db = await getDb();
const snapshot = await db.getDocs(
    'equipment',
    { type: 'where', field: 'userId', op: '==', value: userId },
    { type: 'orderBy', field: 'purchaseDate', direction: 'desc' },
    { type: 'limit', value: 10 }
);
```

### Pattern 3: Subcollections

```typescript
// ❌ Before
const { db } = await getFirebaseServices();
const componentsRef = collection(db, `users/${userId}/equipment/${equipmentId}/components`);
const snapshot = await getDocs(componentsRef);

// ✅ After
const db = await getDb();
const snapshot = await db.getSubDocs(
    'users',
    userId,
    'equipment',
    equipmentId,
    'components'
);
```

### Pattern 4: Timestamp Handling

```typescript
// ❌ Before - Manual conversion required
import { Timestamp } from 'firebase/firestore';

interface UserData {
    createdAt: Timestamp;
    birthdate?: Timestamp;
}

const data = docSnap.data() as UserData;
const createdDate = data.createdAt.toDate();
const birthdate = data.birthdate?.toDate();

// ✅ After - Automatic conversion
interface UserData {
    createdAt: Date;
    birthdate?: Date;
}

const data = docSnap.data as UserData;
const createdDate = data.createdAt; // Already a Date
const birthdate = data.birthdate; // Already a Date or undefined
```

### Pattern 5: Field Values

```typescript
// ❌ Before - Import from Firebase
import { serverTimestamp, increment, arrayUnion, deleteField } from 'firebase/firestore';

await updateDoc(docRef, {
    lastLogin: serverTimestamp(),
    loginCount: increment(1),
    roles: arrayUnion('admin'),
    tempField: deleteField()
});

// ✅ After - Use database methods
const db = await getDb();
await db.updateDoc('users', userId, {
    lastLogin: new Date(), // Or db.serverTimestamp() for server timestamp
    loginCount: db.increment(1),
    roles: db.arrayUnion('admin'),
    tempField: db.deleteField()
});
```

---

## Migration Checklist

When refactoring a file from Firebase to backend abstraction:

- [ ] Replace Firebase imports with backend imports
  - `import { adminDb } from '@/lib/firebase-admin'` → `import { getServerDb } from '@/backend'`
  - `import { getFirebaseServices } from '@/lib/firebase'` → `import { getDb, getAuth, getStorage } from '@/backend'`

- [ ] Update type imports
  - `import { Timestamp } from 'firebase/firestore'` → Remove (use `Date` instead)
  - `import type { X } from '@/lib/types'` → `import type { X } from '@/backend/types'`

- [ ] Replace Firebase operations
  - `doc()`, `collection()` → `db.getDoc()`, `db.getDocs()`
  - `onSnapshot()` → `db.onSnapshot()`, `db.onSnapshotQuery()`
  - `writeBatch()` → `db.batch()`

- [ ] Update timestamp handling
  - Remove manual `Timestamp.fromDate()` and `.toDate()` calls
  - Use `Date` objects directly

- [ ] Update field values
  - Replace Firebase field values with `db.serverTimestamp()`, `db.increment()`, etc.

- [ ] Test both backends
  - Ensure code works with `NEXT_PUBLIC_BACKEND_PROVIDER=firebase`
  - Prepare for `NEXT_PUBLIC_BACKEND_PROVIDER=supabase`

---

## Testing Your Migration

After refactoring, verify:

1. **No Firebase imports** in the refactored file (except in adapter files)
2. **No Timestamp types** in type definitions (use `Date` instead)
3. **Backend factory usage** for all database operations
4. **Proper error handling** (backend-agnostic errors)
5. **Type safety** maintained throughout

Run your tests:
```bash
# Test with Firebase (current backend)
NEXT_PUBLIC_BACKEND_PROVIDER=firebase npm run build

# Future: Test with Supabase
NEXT_PUBLIC_BACKEND_PROVIDER=supabase npm run build
```

---

## Need Help?

- Check `src/backend/README.md` for API documentation
- Review `src/backend/interfaces/` for interface definitions
- Look at `src/context/auth-context.tsx` for a complete migration example
- See `src/backend/firebase/` for adapter implementation patterns
