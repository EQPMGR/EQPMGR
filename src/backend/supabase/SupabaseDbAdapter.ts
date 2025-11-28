/**
 * Supabase Database Adapter
 * Implements IDatabase interface using Supabase Postgres + Realtime
 */

import type {
  IDatabase,
  QueryConstraint,
  DocumentSnapshot,
  QuerySnapshot,
  FieldValue,
  VectorSearchOptions,
  BatchWrite,
  Transaction,
  UnsubscribeFunction,
  WhereFilterOp,
} from '../interfaces';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { getServerConfig } from './config';

// Singleton Supabase client instance (client-side)
let clientInstance: SupabaseClient | null = null;

// Singleton Supabase client instance (server-side with service role)
let serverInstance: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 */
function getSupabaseClient(isServer: boolean): SupabaseClient {
  if (isServer) {
    if (!serverInstance) {
      const config = getServerConfig();
      serverInstance = createClient(config.url, config.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }
    return serverInstance;
  } else {
    if (!clientInstance) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !anonKey) {
        throw new Error('Missing Supabase client configuration. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }

      clientInstance = createClient(url, anonKey);
    }
    return clientInstance;
  }
}

/**
 * Apply query constraints to a Supabase query
 */
function applyConstraints<T>(
  query: any,
  constraints: QueryConstraint[]
): any {
  let modifiedQuery = query;

  for (const constraint of constraints) {
    switch (constraint.type) {
      case 'where':
        if (constraint.field && constraint.op && constraint.value !== undefined) {
          modifiedQuery = applyWhereFilter(modifiedQuery, constraint.field, constraint.op, constraint.value);
        }
        break;
      case 'orderBy':
        if (constraint.field) {
          modifiedQuery = modifiedQuery.order(constraint.field, {
            ascending: constraint.direction !== 'desc'
          });
        }
        break;
      case 'limit':
        if (constraint.value !== undefined) {
          modifiedQuery = modifiedQuery.limit(constraint.value);
        }
        break;
      case 'startAfter':
      case 'startAt':
        // Pagination in Supabase typically uses range
        // This is a simplified implementation
        console.warn('startAfter/startAt pagination not fully implemented');
        break;
    }
  }

  return modifiedQuery;
}

/**
 * Apply where filter to query
 */
function applyWhereFilter(
  query: any,
  field: string,
  op: WhereFilterOp,
  value: any
): any {
  switch (op) {
    case '==':
      return query.eq(field, value);
    case '!=':
      return query.neq(field, value);
    case '<':
      return query.lt(field, value);
    case '<=':
      return query.lte(field, value);
    case '>':
      return query.gt(field, value);
    case '>=':
      return query.gte(field, value);
    case 'in':
      return query.in(field, value);
    case 'not-in':
      return query.not(field, 'in', value);
    case 'array-contains':
      return query.contains(field, [value]);
    case 'array-contains-any':
      return query.overlaps(field, value);
    default:
      console.warn(`Unsupported filter operation: ${op}`);
      return query;
  }
}

/**
 * Convert Supabase row to DocumentSnapshot
 */
function toDocumentSnapshot<T>(row: any, collection: string): DocumentSnapshot<T> {
  if (!row) {
    return {
      id: '',
      data: undefined,
      exists: false
    };
  }

  const { id, ...data } = row;

  return {
    id: id,
    data: data as T,
    exists: true
  };
}

/**
 * Convert Supabase rows to QuerySnapshot
 */
function toQuerySnapshot<T>(rows: any[], collection: string): QuerySnapshot<T> {
  const docs = rows.map(row => toDocumentSnapshot<T>(row, collection));

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length
  };
}

/**
 * Process data for FieldValue special types
 */
function processFieldValues(data: any, supabase: SupabaseClient): any {
  // Convert camelCase keys to snake_case to match typical Postgres column naming
  const camelToSnake = (s: string) =>
    s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

  // Normalize individual values before sending to Postgres
  const normalizeValue = (key: string, value: any): any => {
    if (value === undefined) return undefined;
    if (value === '') return null; // empty string -> null for DB

    // Preserve FieldValue wrapper objects untouched here
    if (value && typeof value === 'object' && 'type' in value) return value;

    // Empty object -> treat as null (prevents sending {} to timestamptz)
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
      return null;
    }

    if (value instanceof Date) return value.toISOString();

    const lk = key.toLowerCase();
    if ((lk.endsWith('_at') || lk.includes('date') || lk.includes('birth')) && typeof value === 'string') {
      const parsed = Date.parse(value);
      return isNaN(parsed) ? null : new Date(parsed).toISOString();
    }

    return value;
  };

  const transformKeysToSnake = (value: any): any => {
    if (Array.isArray(value)) return value.map(transformKeysToSnake);
    if (value && typeof value === 'object') {
      // Preserve FieldValue objects but transform their inner `value` recursively
      if ('type' in value) {
        return { ...value, value: transformKeysToSnake((value as any).value) };
      }

      const out: any = {};
      for (const [k, v] of Object.entries(value)) {
        const snakeKey = camelToSnake(k);
        const transformed = transformKeysToSnake(v);
        out[snakeKey] = normalizeValue(snakeKey, transformed);
      }
      return out;
    }
    return value;
  };

  const processed = transformKeysToSnake(data || {});

  for (const [key, value] of Object.entries(processed)) {
    if (value && typeof value === 'object' && 'type' in value) {
      const fieldValue = value as FieldValue;

      switch (fieldValue.type) {
        case 'serverTimestamp':
          processed[key] = new Date().toISOString();
          break;
        case 'increment':
          console.warn('increment field value not fully supported in Supabase adapter');
          processed[key] = fieldValue.value;
          break;
        case 'arrayUnion':
          console.warn('arrayUnion field value not fully supported in Supabase adapter');
          processed[key] = fieldValue.value;
          break;
        case 'arrayRemove':
          console.warn('arrayRemove field value not fully supported in Supabase adapter');
          processed[key] = fieldValue.value;
          break;
        case 'delete':
          delete processed[key];
          break;
      }
    }
  }

  return processed;
}

export class SupabaseDbAdapter implements IDatabase {
  private supabase: SupabaseClient;
  private isServer: boolean;
  private columnCache: Map<string, Set<string>> = new Map();

  // Fallback known columns for common tables to use when table is empty or discovery fails
  private static DEFAULT_TABLE_COLUMNS: Record<string, string[]> = {
    app_users: [
      'id', 'uid', 'email', 'email_verified', 'display_name', 'phone', 'photo_url', 'avatar_url',
      'height', 'weight', 'shoe_size', 'birthdate', 'measurement_system', 'shoe_size_system',
      'distance_unit', 'date_format', 'created_at', 'last_login'
    ],
    equipment: [
      'id','app_user_id','name','type','brand','model','model_year','serial_number','frame_size','size',
      'shoe_size_system','purchase_condition','purchase_date','purchase_price','total_distance','total_hours',
      'image_url','wheelsets','associated_equipment_ids','maintenance_log','created_at','updated_at'
    ],
    components: [
      'id','equipment_id','parent_user_component_id','master_component_id','name','wear_percentage','last_service_date',
      'purchase_date','notes','size','wheelset_id','created_at','updated_at'
    ],
    master_components: [
      'id','name','brand','series','model','system','size','size_variants','chainring1','chainring2','chainring3','embedding','created_at','updated_at'
    ],
    bike_models: [
      'id','brand','model','model_year','frame_size_options','created_by','created_at','updated_at'
    ],
    service_providers: [
      'id','name','shop_name','logo_url','services','address','city','province','postal_code','country','phone','website','geohash','lat','lng','average_rating','rating_count','created_at','updated_at'
    ],
    work_orders: [
      'id','user_id','user_name','user_phone','user_email','service_provider_id','service_provider_auth_uid','provider_name','equipment_id','equipment_name','equipment_brand','equipment_model','service_type','status','notes','fit_data','created_at','updated_at','user_consent'
    ],
    counters: ['id','count','updated_at'],
    ignored_duplicates: ['id','ignored','ignored_at'],
    _health_check: ['id','last_checked']
  };

  private async getTableColumns(table: string): Promise<Set<string>> {
    if (this.columnCache.has(table)) return this.columnCache.get(table)!;

    // Use default mapping if available
    const defaults = (SupabaseDbAdapter.DEFAULT_TABLE_COLUMNS || {})[table];
    if (defaults && defaults.length > 0) {
      const s = new Set<string>(defaults);
      this.columnCache.set(table, s);
      return s;
    }

    try {
      // Try to discover columns by fetching a single row and taking its keys
      const { data, error } = await this.supabase.from(table).select('*').limit(1);
      if (error) {
        // Discovery failed; cache empty set to avoid repeated attempts
        this.columnCache.set(table, new Set<string>());
        return new Set<string>();
      }

      if (Array.isArray(data) && data.length > 0) {
        const cols = new Set<string>(Object.keys(data[0] || {}));
        this.columnCache.set(table, cols);
        return cols;
      }

      // No rows to infer columns from; cache empty set
      this.columnCache.set(table, new Set<string>());
      return new Set<string>();
    } catch (err) {
      this.columnCache.set(table, new Set<string>());
      return new Set<string>();
    }
  }

  private async filterToAllowedColumns(collection: string, obj: Record<string, any>): Promise<Record<string, any>> {
    const allowed = await this.getTableColumns(collection);

    // If we couldn't determine allowed columns, return original object
    if (!allowed || allowed.size === 0) return obj;

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (allowed.has(k)) out[k] = v;
    }

    return out;
  }

  // Final sanitization to prevent sending objects like {} for timestamptz/date columns
  // Recursively convert empty objects -> null, empty string -> null, Date -> ISO string
  private sanitizePayload(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return obj === '' ? null : obj;
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(v => this.sanitizePayload(v));
    if (typeof obj === 'object') {
      // Empty plain object -> null
      if (Object.keys(obj).length === 0) return null;
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = this.sanitizePayload(v);
      }
      return out;
    }
    return obj;
  }

  constructor(isServer: boolean = false) {
    this.isServer = isServer;
    this.supabase = getSupabaseClient(isServer);
  }

  async getDoc<T = any>(collection: string, docId: string): Promise<DocumentSnapshot<T>> {
    const { data, error } = await this.supabase
      .from(collection)
      .select('*')
      .eq('id', docId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw new Error(`Failed to get document: ${error.message}`);
    }

    return toDocumentSnapshot<T>(data, collection);
  }

  async getSubDoc<T = any>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    subDocId: string
  ): Promise<DocumentSnapshot<T>> {
    // In Supabase, subcollections are implemented as separate tables with foreign keys
    // For example, components table has equipment_id referencing equipment
    // The naming convention is: parent table = equipment, subcollection = components
    // We need to join or filter by the parent's ID

    const parentIdField = `${parentCollection.slice(0, -1)}_id`; // e.g., equipment -> equipment_id

    const { data, error } = await this.supabase
      .from(subCollection)
      .select('*')
      .eq('id', subDocId)
      .eq(parentIdField, parentDocId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get subdocument: ${error.message}`);
    }

    return toDocumentSnapshot<T>(data, subCollection);
  }

  async getDocs<T = any>(collection: string, ...constraints: QueryConstraint[]): Promise<QuerySnapshot<T>> {
    let query = this.supabase.from(collection).select('*');

    query = applyConstraints(query, constraints);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get documents: ${error.message}`);
    }

    return toQuerySnapshot<T>(data || [], collection);
  }

  async getSubDocs<T = any>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    ...constraints: QueryConstraint[]
  ): Promise<QuerySnapshot<T>> {
    const parentIdField = `${parentCollection.slice(0, -1)}_id`;

    let query = this.supabase
      .from(subCollection)
      .select('*')
      .eq(parentIdField, parentDocId);

    query = applyConstraints(query, constraints);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get subdocuments: ${error.message}`);
    }

    return toQuerySnapshot<T>(data || [], subCollection);
  }

  async setDoc<T>(collection: string, docId: string, data: T, merge?: boolean): Promise<void> {
    const processedData = processFieldValues(data, this.supabase);
    const dataWithId = { ...processedData, id: docId };

    // Filter payload to known table columns to avoid PostgREST rejecting unknown fields
    const filtered = await this.filterToAllowedColumns(collection, dataWithId);

    try {
      // Sanitize final payload to avoid sending {} for timestamps
      const sanitized = this.sanitizePayload(filtered);

      const { error } = await this.supabase
        .from(collection)
        .upsert(sanitized as any, { onConflict: 'id' });

      if (error) {
        throw new Error(`Failed to set document: ${error.message}`);
      }
    } catch (err: any) {
      throw new Error(`Failed to set document: ${err.message}`);
    }
  }

  async setSubDoc<T>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    subDocId: string,
    data: T,
    merge?: boolean
  ): Promise<void> {
    const parentIdField = `${parentCollection.slice(0, -1)}_id`;
    const processedData = processFieldValues(data, this.supabase);
    const dataWithIds = {
      ...processedData,
      id: subDocId,
      [parentIdField]: parentDocId
    };

    const filtered = await this.filterToAllowedColumns(subCollection, dataWithIds);

      // Sanitize final payload to avoid sending {} for timestamps
      const sanitizedSub = this.sanitizePayload(filtered);

      const { error } = await this.supabase
        .from(subCollection)
        .upsert(sanitizedSub as any, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to set subdocument: ${error.message}`);
    }
  }

  async updateDoc<T>(collection: string, docId: string, data: Partial<T>): Promise<void> {
    const processedData = processFieldValues(data, this.supabase);
    const filtered = await this.filterToAllowedColumns(collection, processedData);

    const sanitized = this.sanitizePayload(filtered);

    const { error } = await this.supabase
      .from(collection)
      .update(sanitized as any)
      .eq('id', docId);

    if (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  async updateSubDoc<T>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    subDocId: string,
    data: Partial<T>
  ): Promise<void> {
    const parentIdField = `${parentCollection.slice(0, -1)}_id`;
    const processedData = processFieldValues(data, this.supabase);

    const filtered = await this.filterToAllowedColumns(subCollection, processedData);

    const sanitized = this.sanitizePayload(filtered);

    const { error } = await this.supabase
      .from(subCollection)
      .update(sanitized as any)
      .eq('id', subDocId)
      .eq(parentIdField, parentDocId);

    if (error) {
      throw new Error(`Failed to update subdocument: ${error.message}`);
    }
  }

  async deleteDoc(collection: string, docId: string): Promise<void> {
    const { error } = await this.supabase
      .from(collection)
      .delete()
      .eq('id', docId);

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  async deleteSubDoc(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    subDocId: string
  ): Promise<void> {
    const parentIdField = `${parentCollection.slice(0, -1)}_id`;

    const { error } = await this.supabase
      .from(subCollection)
      .delete()
      .eq('id', subDocId)
      .eq(parentIdField, parentDocId);

    if (error) {
      throw new Error(`Failed to delete subdocument: ${error.message}`);
    }
  }

  onSnapshot<T>(
    collection: string,
    docId: string,
    callback: (snapshot: DocumentSnapshot<T>) => void,
    onError?: (error: Error) => void
  ): UnsubscribeFunction {
    if (this.isServer) {
      console.warn('onSnapshot called on server-side adapter - this is a no-op');
      return () => {};
    }

    // Initial fetch
    this.getDoc<T>(collection, docId).then(callback).catch(error => {
      if (onError) onError(error);
    });

    // Subscribe to changes
    const channel = this.supabase
      .channel(`${collection}:${docId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: collection,
          filter: `id=eq.${docId}`
        },
        (payload) => {
          const snapshot = toDocumentSnapshot<T>(payload.new || null, collection);
          callback(snapshot);
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  onSnapshotQuery<T>(
    collection: string,
    callback: (snapshot: QuerySnapshot<T>) => void,
    onError?: (error: Error) => void,
    ...constraints: QueryConstraint[]
  ): UnsubscribeFunction {
    if (this.isServer) {
      console.warn('onSnapshotQuery called on server-side adapter - this is a no-op');
      return () => {};
    }

    // Initial fetch
    this.getDocs<T>(collection, ...constraints).then(callback).catch(error => {
      if (onError) onError(error);
    });

    // Subscribe to all changes in the collection
    // Note: Filtering on client side as Supabase realtime doesn't support complex filters
    const channel = this.supabase
      .channel(`${collection}:all`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: collection
        },
        () => {
          // Re-fetch with constraints when any change occurs
          this.getDocs<T>(collection, ...constraints).then(callback).catch(error => {
            if (onError) onError(error);
          });
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  onSnapshotSubCollection<T>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    callback: (snapshot: QuerySnapshot<T>) => void,
    onError?: (error: Error) => void,
    ...constraints: QueryConstraint[]
  ): UnsubscribeFunction {
    if (this.isServer) {
      console.warn('onSnapshotSubCollection called on server-side adapter - this is a no-op');
      return () => {};
    }

    const parentIdField = `${parentCollection.slice(0, -1)}_id`;

    // Initial fetch
    this.getSubDocs<T>(parentCollection, parentDocId, subCollection, ...constraints)
      .then(callback)
      .catch(error => {
        if (onError) onError(error);
      });

    // Subscribe to changes
    const channel = this.supabase
      .channel(`${subCollection}:${parentDocId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: subCollection,
          filter: `${parentIdField}=eq.${parentDocId}`
        },
        () => {
          this.getSubDocs<T>(parentCollection, parentDocId, subCollection, ...constraints)
            .then(callback)
            .catch(error => {
              if (onError) onError(error);
            });
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  batch(): BatchWrite {
    const operations: Array<() => Promise<void>> = [];

    return {
      set: <T>(collection: string, docId: string, data: T) => {
        operations.push(() => this.setDoc(collection, docId, data));
      },
      update: <T>(collection: string, docId: string, data: Partial<T>) => {
        operations.push(() => this.updateDoc(collection, docId, data));
      },
      delete: (collection: string, docId: string) => {
        operations.push(() => this.deleteDoc(collection, docId));
      },
      commit: async () => {
        // Execute all operations in parallel
        // Note: This is not a true atomic transaction like Firestore batch
        await Promise.all(operations.map(op => op()));
      }
    };
  }

  async runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T> {
    // Supabase doesn't have direct transaction support like Firestore
    // For simple cases, we can use optimistic locking
    // For complex cases, you'd need to use Postgres RPC functions

    const transactionData: Map<string, any> = new Map();
    const operations: Array<() => Promise<void>> = [];

    const transaction: Transaction = {
      get: async <T>(collection: string, docId: string) => {
        const key = `${collection}:${docId}`;
        if (transactionData.has(key)) {
          return transactionData.get(key);
        }

        const snapshot = await this.getDoc<T>(collection, docId);
        transactionData.set(key, snapshot);
        return snapshot;
      },
      set: <T>(collection: string, docId: string, data: T) => {
        operations.push(() => this.setDoc(collection, docId, data));
      },
      update: <T>(collection: string, docId: string, data: Partial<T>) => {
        operations.push(() => this.updateDoc(collection, docId, data));
      },
      delete: (collection: string, docId: string) => {
        operations.push(() => this.deleteDoc(collection, docId));
      }
    };

    const result = await updateFunction(transaction);

    // Execute all operations
    await Promise.all(operations.map(op => op()));

    return result;
  }

  generateId(): string {
    return crypto.randomUUID();
  }

  serverTimestamp(): FieldValue {
    return { type: 'serverTimestamp' };
  }

  increment(n: number): FieldValue {
    return { type: 'increment', value: n };
  }

  arrayUnion(...elements: any[]): FieldValue {
    return { type: 'arrayUnion', value: elements };
  }

  arrayRemove(...elements: any[]): FieldValue {
    return { type: 'arrayRemove', value: elements };
  }

  deleteField(): FieldValue {
    return { type: 'delete' };
  }

  async findNearest<T>(
    collection: string,
    vectorField: string,
    queryVector: number[],
    options: VectorSearchOptions
  ): Promise<Array<DocumentSnapshot<T> & { distance?: number }>> {
    // Use the RPC function created in the migration
    // The function is named search_similar_components

    let rpcFunctionName: string;
    if (collection === 'master_components') {
      rpcFunctionName = 'search_similar_components';
    } else {
      throw new Error(`Vector search not configured for collection: ${collection}`);
    }

    const { data, error } = await this.supabase.rpc(rpcFunctionName, {
      query_embedding: queryVector,
      match_threshold: 0.0, // We'll filter by limit instead
      match_count: options.limit
    });

    if (error) {
      throw new Error(`Vector search failed: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      data: row as T,
      exists: true,
      distance: 1 - (row.similarity || 0) // Convert similarity to distance
    }));
  }

  toTimestamp(date: Date): string {
    return date.toISOString();
  }

  fromTimestamp(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return null;
  }

  getDbInstance(): SupabaseClient {
    return this.supabase;
  }
}
