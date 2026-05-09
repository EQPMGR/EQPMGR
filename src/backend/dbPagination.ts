import type { IDatabase, QueryConstraint, DocumentSnapshot } from '@/backend/interfaces';

/**
 * Iterates through a collection in batches using a cursor on `orderByField`.
 * This is useful for large collections that should not be loaded in a single query.
 */
export async function fetchAllDocsPaginated<T>(
  db: IDatabase,
  collection: string,
  pageSize: number = 500,
  orderByField: string = 'id',
  extraConstraints: QueryConstraint[] = []
): Promise<DocumentSnapshot<T>[]> {
  const results: DocumentSnapshot<T>[] = [];
  let lastValue: any = undefined;

  while (true) {
    const constraints: QueryConstraint[] = [...extraConstraints];

    // Ensure pagination order is deterministic
    if (!constraints.some((constraint) => constraint.type === 'orderBy')) {
      constraints.push({ type: 'orderBy', field: orderByField, direction: 'asc' });
    }

    constraints.push({ type: 'limit', value: pageSize });
    if (lastValue !== undefined) {
      constraints.push({ type: 'startAfter', field: orderByField, value: lastValue });
    }

    const snapshot = await db.getDocs<T>(collection, ...constraints);
    if (snapshot.empty) {
      break;
    }

    results.push(...snapshot.docs);

    if (snapshot.docs.length < pageSize) {
      break;
    }

    lastValue = snapshot.docs[snapshot.docs.length - 1].id;
  }

  return results;
}
