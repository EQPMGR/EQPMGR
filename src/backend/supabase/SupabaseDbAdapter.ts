/**
 * Supabase Database Adapter
 * Implements IDatabase interface using Supabase Postgres + Realtime
 * 
 * ============================================================================
 * NAMING CONVENTION BRIDGE
 * ============================================================================
 * 
 * This adapter follows an enterprise architectural pattern for clean separation
 * of concerns:
 * 
 * DATABASE LAYER (Supabase PostgreSQL):
 *   - Uses snake_case for all column names (SQL standard)
 *   - Example: user_id, created_at, wear_percentage
 *   - Defined in: supabase/migrations/*.sql
 * 
 * APPLICATION LAYER (TypeScript/React):
 *   - Uses camelCase for all properties (JavaScript standard)
 *   - Example: userId, createdAt, wearPercentage
 *   - Defined in: src/lib/types.ts
 * 
 * ADAPTER RESPONSIBILITY:
 *   - Converts snake_case → camelCase when READING from database
 *   - Converts camelCase → snake_case when WRITING to database
 *   - Queries use snake_case field names to match database schema
 *   - Application code uses camelCase everywhere (never sees raw snake_case)
 * 
 * This pattern is used by enterprise systems like:
 *   - Django ORM (converts Python naming to SQL naming)
 *   - TypeORM (supports automatic naming transformations)
 *   - Prisma (custom column mappings)
 * 
 * BENEFITS:
 *   ✓ Database stays portable and standards-compliant (SQL uses snake_case)
 *   ✓ Application code stays idiomatic JavaScript (camelCase)
 *   ✓ Naming transformation happens in exactly one place (this adapter)
 *   ✓ Easy to swap database or add new ORMs without changing app code
 *   ✓ Clear separation of concerns between layers
 * ============================================================================
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
 * ============================================================================
 * NAMING CONVENTION UTILITIES
 * ============================================================================
 * These utility functions handle the transformation between database naming
 * (snake_case) and application naming (camelCase).
 */

/**
 * Convert snake_case to camelCase
 * Example: user_id → userId, created_at → createdAt
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 * Example: userId → user_id, createdAt → created_at
 */
function camelToSnake(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function normalizeTableName(collection: string): string {
  // Convert camelCase table names like workOrders to work_orders. Keep snake_case as-is.
  if (collection.includes('_')) {
    return collection;
  }
  return camelToSnake(collection);
}

/**
 * Recursively convert all object keys from snake_case to camelCase
 * USED FOR: Reading data from database and converting to app format
 * 
 * Example input (from database):
 *   { user_id: "123", created_at: "2024-01-01", fit_data: { saddle_height: 75 } }
 * 
 * Example output (for application):
 *   { userId: "123", createdAt: "2024-01-01", fitData: { saddleHeight: 75 } }
 */
function convertKeysToCamelCase<T>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase) as any as T;
  }

  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      converted[camelKey] = convertKeysToCamelCase(value);
    }
    return converted as T;
  }

  return obj as T;
}

/**
 * Apply query constraints to a Supabase query
 * Converts field names from camelCase to snake_case for database queries
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
          // Convert field name to snake_case for database
          const snakeField = camelToSnake(constraint.field);
          modifiedQuery = applyWhereFilter(modifiedQuery, snakeField, constraint.op, constraint.value);
        }
        break;
      case 'orderBy':
        if (constraint.field) {
          // Convert field name to snake_case for database
          const snakeField = camelToSnake(constraint.field);
          modifiedQuery = modifiedQuery.order(snakeField, {
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
        if (constraint.field && constraint.value !== undefined) {
          const snakeField = camelToSnake(constraint.field);
          modifiedQuery = modifiedQuery.gt(snakeField, constraint.value);
        }
        break;
      case 'startAt':
        if (constraint.field && constraint.value !== undefined) {
          const snakeField = camelToSnake(constraint.field);
          modifiedQuery = modifiedQuery.gte(snakeField, constraint.value);
        }
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
 * 
 * NAMING CONVERSION:
 *   - Reads row with snake_case keys from database
 *   - Converts all keys to camelCase for application code
 *   - Application layer never sees raw snake_case keys
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
    data: convertKeysToCamelCase<T>(data),
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
 * Process data for FieldValue special types and naming conversion
 * 
 * INPUT: Application data in camelCase
 *   Example: { userId: "123", purchaseDate: "2024-01-01", fitData: {...} }
 * 
 * OUTPUT: Database-ready data in snake_case
 *   Example: { user_id: "123", purchase_date: "2024-01-01", fit_data: {...} }
 * 
 * Also handles date normalization and FieldValue operations
 */
function processFieldValues(data: any, supabase: SupabaseClient): any {
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

    if (value instanceof Date) {
      const lk = key.toLowerCase();
      if (lk.includes('birth') || lk.includes('date')) {
        return value.toISOString().split('T')[0];
      }
      return value.toISOString();
    }

    const lk = key.toLowerCase();
    // avoid converting format keys like date_format to actual dates
    const isDateField = (lk.endsWith('_at') || lk.endsWith('_date') || lk.includes('birth')) && !lk.includes('date_format');
    if (isDateField && typeof value === 'string') {
      const parsed = Date.parse(value);
      return isNaN(parsed) ? null : new Date(parsed).toISOString();
    }

    return value;
  };

  // Recursively process all values and convert keys from camelCase to snake_case
  const transformToSnake = (value: any): any => {
    if (Array.isArray(value)) return value.map(transformToSnake);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      // Preserve FieldValue objects but process their inner `value` recursively
      if ('type' in value) {
        return { ...value, value: transformToSnake((value as any).value) };
      }

      const out: any = {};
      for (const [k, v] of Object.entries(value)) {
        const snakeKey = camelToSnake(k);  // Convert: userId → user_id
        const transformed = transformToSnake(v);
        out[snakeKey] = normalizeValue(snakeKey, transformed);
      }
      return out;
    }
    return value;
  };

  const processed = transformToSnake(data || {});

  // Handle FieldValue operations
  for (const [key, value] of Object.entries(processed)) {
    if (value && typeof value === 'object' && 'type' in value) {
      const fieldValue = value as FieldValue;

      switch (fieldValue.type) {
        case 'serverTimestamp':
          processed[key] = new Date().toISOString();
          break;
        case 'increment':
        case 'arrayUnion':
        case 'arrayRemove':
          // Preserve these operations for the update/updateSubDoc helpers
          processed[key] = fieldValue;
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
      'distance_unit', 'date_format', 'created_at', 'last_login', 'strava'
    ],
    equipment: [
      'id','user_id','app_user_id','name','type','brand','model','model_year','serial_number','frame_size','size',
      'shoe_size_system','purchase_condition','purchase_date','purchase_price','total_distance','total_hours',
      'image_url','wheelsets','associated_equipment_ids','maintenance_log','master_bike_model_id','fit_data','archived_components','created_at','updated_at'
    ],
    components: [
      'id','equipment_id','user_id','parent_user_component_id','master_component_id','name','wear_percentage','last_service_date',
      'purchase_date','notes','size','wheelset_id','installed_at_distance','current_distance','expected_replacement_km','is_active','replacement_count','installed_at','replaced_by_user','created_at','updated_at'
    ],
    master_components: [
      'id','name','brand','series','model','system','size','size_variants','chainring1','chainring2','chainring3','recommended_interval_km','replacement_interval_km','observed_interval_km_avg','observed_interval_km_count','observed_interval_km_median','slug','embedding','created_at','updated_at'
    ],
    bike_models: [
      'id','brand','model','model_year','type','frame_size','image_url','slug','created_by','created_at','updated_at'
    ],
    bike_model_components: [
      'id','bike_model_id','master_component_id','component_name','system','position','size','chainring1','chainring2','chainring3','created_at','updated_at'
    ],
    component_replacement_events: [
      'id','equipment_id','equipment_component_id','master_component_id','actual_interval_km','replacement_reason','replaced_at_distance','notes','created_at','updated_at'
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
    const normalizedTable = normalizeTableName(table);
    if (this.columnCache.has(normalizedTable)) return this.columnCache.get(normalizedTable)!;

    const defaults = (SupabaseDbAdapter.DEFAULT_TABLE_COLUMNS || {})[normalizedTable] || (SupabaseDbAdapter.DEFAULT_TABLE_COLUMNS || {})[table];

    try {
      // Try to discover columns by fetching a single row and taking its keys.
      const { data, error } = await this.supabase.from(normalizedTable).select('*').limit(1);
      if (error) {
        // Discovery failed; fallback to defaults if available
        if (defaults && defaults.length > 0) {
          const s = new Set<string>(defaults);
          this.columnCache.set(normalizedTable, s);
          return s;
        }

        this.columnCache.set(normalizedTable, new Set<string>());
        return new Set<string>();
      }

      if (Array.isArray(data) && data.length > 0) {
        const cols = new Set<string>(Object.keys(data[0] || {}));
        this.columnCache.set(normalizedTable, cols);
        return cols;
      }

      // No rows to infer columns; fallback to defaults if available
      if (defaults && defaults.length > 0) {
        const s = new Set<string>(defaults);
        this.columnCache.set(normalizedTable, s);
        return s;
      }

      this.columnCache.set(normalizedTable, new Set<string>());
      return new Set<string>();
    } catch (err) {
      if (defaults && defaults.length > 0) {
        const s = new Set<string>(defaults);
        this.columnCache.set(normalizedTable, s);
        return s;
      }

      this.columnCache.set(normalizedTable, new Set<string>());
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
    let normalizedCollection = normalizeTableName(collection);
    let { data, error } = await this.supabase
      .from(normalizedCollection)
      .select('*')
      .eq('id', docId)
      .maybeSingle();

    if (error && error.code === '42P01') {
      const fallbackCollection = normalizedCollection.endsWith('s')
        ? normalizedCollection.slice(0, -1)
        : `${normalizedCollection}s`;

      const fallbackRes = await this.supabase
        .from(fallbackCollection)
        .select('*')
        .eq('id', docId)
        .maybeSingle();

      data = fallbackRes.data;
      error = fallbackRes.error;
      normalizedCollection = fallbackCollection;
    }

    if (error && error.code !== 'PGRST116') {
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

    const parentIdField = this.buildParentIdField(parentCollection);

    const normalizedSubCollection = normalizeTableName(subCollection);
    const { data, error } = await this.supabase
      .from(normalizedSubCollection)
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
    let normalizedCollection = normalizeTableName(collection);
    let query = this.supabase.from(normalizedCollection).select('*');

    query = applyConstraints(query, constraints);

    let { data, error } = await query;

    if (error) {
      // If table not found, try a fallback singular/plural variation.
      if (error.code === '42P01') {
        const fallbackCollection = normalizedCollection.endsWith('s')
          ? normalizedCollection.slice(0, -1)
          : `${normalizedCollection}s`;

        const fallbackQuery = this.supabase.from(fallbackCollection).select('*');
        const fallbackRes = await fallbackQuery;

        if (!fallbackRes.error) {
          normalizedCollection = fallbackCollection;
          data = fallbackRes.data;
          error = null;
        }
      }
    }

    if (error) {
      throw new Error(`Failed to get documents: ${error.message}`);
    }

    return toQuerySnapshot<T>(data || [], collection);
  }

  private buildParentIdField(parentCollection: string): string {
    const normalized = normalizeTableName(parentCollection);
    const base = normalized.endsWith('s') ? normalized.slice(0, -1) : normalized;
    return `${base}_id`;
  }

  private parseParentCollection(parentCollection: string): { collection: string; parentDocId: string; parentUserId?: string } {
    const parts = parentCollection.split('/').filter(Boolean);

    if (parts.length === 2) {
      return { collection: parts[0], parentDocId: parts[1] };
    }

    if (parts.length === 4 && parts[0] === 'app_users' && parts[2] === 'equipment') {
      return { collection: 'equipment', parentDocId: parts[3], parentUserId: parts[1] };
    }

    throw new Error(`Invalid parentCollection path: ${parentCollection}`);
  }

  async getDocsFromSubcollection<T = any>(
    parentCollectionPath: string,
    subCollection: string,
    ...constraints: QueryConstraint[]
  ): Promise<QuerySnapshot<T>> {
    const { parentDocId } = this.parseParentCollection(parentCollectionPath);
    return this.getSubDocs<T>(parentCollectionPath, parentDocId, subCollection, ...constraints);
  }

  async getSubDocs<T = any>(
    parentCollection: string,
    parentDocId: string,
    subCollection: string,
    ...constraints: QueryConstraint[]
  ): Promise<QuerySnapshot<T>> {
    const parentCollectionInfo = this.parseParentCollection(parentCollection);
    const parentIdField = this.buildParentIdField(parentCollectionInfo.collection);

    const normalizedSubCollection = normalizeTableName(subCollection);
    let query = this.supabase
      .from(normalizedSubCollection)
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

      const normalizedCollection = normalizeTableName(collection);

      // Safety guard for required fields in equipment table
      if (normalizedCollection === 'equipment') {
        if (!sanitized.purchase_date) {
          sanitized.purchase_date = new Date().toISOString().split('T')[0];
        }
        if (!sanitized.type) {
          sanitized.type = 'Unknown';
        }
        if (!sanitized.user_id && !sanitized.app_user_id) {
          throw new Error(`Equipment write missing owner information. Payload: ${JSON.stringify(sanitized)}`);
        }
      }

      if (normalizedCollection === 'components') {
        if (!sanitized.user_id) {
          throw new Error(`Component write missing user_id. Payload: ${JSON.stringify(sanitized)}`);
        }
        if (!sanitized.equipment_id) {
          throw new Error(`Component write missing equipment_id. Payload: ${JSON.stringify(sanitized)}`);
        }
      }

      const { error } = await this.supabase
        .from(normalizedCollection)
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
    const parentIdField = this.buildParentIdField(parentCollection);
    const processedData = processFieldValues(data, this.supabase);
    const dataWithIds = {
      ...processedData,
      id: subDocId,
      [parentIdField]: parentDocId
    };

    const filtered = await this.filterToAllowedColumns(subCollection, dataWithIds);

      // Sanitize final payload to avoid sending {} for timestamps
      const sanitizedSub = this.sanitizePayload(filtered);

      const normalizedSubCollection = normalizeTableName(subCollection);
      // Safety: enforce owner FK for known subcollections if missing
      if (normalizedSubCollection === 'equipment') {
        if (!sanitizedSub.purchase_date) {
          sanitizedSub.purchase_date = new Date().toISOString().split('T')[0];
        }
        if (!sanitizedSub.type) {
          sanitizedSub.type = 'Unknown';
        }
        if (!sanitizedSub.user_id && !sanitizedSub.app_user_id) {
          throw new Error(`Equipment subdocument write missing owner information. Payload: ${JSON.stringify(sanitizedSub)}`);
        }
      }

      if (normalizedSubCollection === 'components') {
        if (!sanitizedSub.user_id) {
          throw new Error(`Component subdocument write missing user_id. Payload: ${JSON.stringify(sanitizedSub)}`);
        }
        if (!sanitizedSub.equipment_id) {
          throw new Error(`Component subdocument write missing equipment_id. Payload: ${JSON.stringify(sanitizedSub)}`);
        }
      }
      const { error } = await this.supabase
        .from(normalizedSubCollection)
        .upsert(sanitizedSub as any, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to set subdocument: ${error.message}`);
    }
  }

  private async resolveFieldValueOperations(collection: string, docId: string, data: any): Promise<any> {
    if (data == null) {
      return data;
    }

    const existingSnapshot = await this.getDoc<any>(collection, docId);
    const existingData = existingSnapshot.exists ? existingSnapshot.data : {};

    const resolveValue = (currentKey: string, value: any, existing: any): any => {
      if (value && typeof value === 'object' && 'type' in value) {
        const fieldValue = value as FieldValue;
        switch (fieldValue.type) {
          case 'increment': {
            const currentValue = Number(existing ?? 0);
            return currentValue + Number(fieldValue.value || 0);
          }
          case 'arrayUnion': {
            const existingArray = Array.isArray(existing) ? existing : [];
            const additions = Array.isArray(fieldValue.value) ? fieldValue.value : [fieldValue.value];
            return Array.from(new Set([...existingArray, ...additions]));
          }
          case 'arrayRemove': {
            const existingArray = Array.isArray(existing) ? existing : [];
            const removals = Array.isArray(fieldValue.value) ? fieldValue.value : [fieldValue.value];
            return existingArray.filter((item: any) => !removals.includes(item));
          }
          default:
            return undefined;
        }
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nestedResult: any = {};
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          const existingNestedValue = existing && typeof existing === 'object' ? existing[nestedKey] : undefined;
          const resolvedNestedValue = resolveValue(nestedKey, nestedValue, existingNestedValue);
          if (resolvedNestedValue !== undefined) {
            nestedResult[nestedKey] = resolvedNestedValue;
          }
        }
        return nestedResult;
      }

      return value;
    };

    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      const existingValue = existingData && key in existingData ? existingData[key] : existingData ? existingData[snakeToCamel(key)] : undefined;
      const resolved = resolveValue(key, value, existingValue);
      if (resolved !== undefined) {
        result[key] = resolved;
      }
    }

    return result;
  }

  async updateDoc<T>(collection: string, docId: string, data: Partial<T>): Promise<void> {
    const processedData = processFieldValues(data, this.supabase);
    const filtered = await this.filterToAllowedColumns(collection, processedData);

    const sanitized = this.sanitizePayload(filtered);
    if (sanitized == null) {
      return;
    }
    const normalizedCollection = normalizeTableName(collection);
    const resolvedPayload = await this.resolveFieldValueOperations(collection, docId, sanitized);

    const { error } = await this.supabase
      .from(normalizedCollection)
      .update(resolvedPayload as any)
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
    const parentIdField = this.buildParentIdField(parentCollection);
    const processedData = processFieldValues(data, this.supabase);

    const filtered = await this.filterToAllowedColumns(subCollection, processedData);

    const sanitized = this.sanitizePayload(filtered);
    const normalizedSubCollection = normalizeTableName(subCollection);
    const resolvedPayload = await this.resolveFieldValueOperations(subCollection, subDocId, sanitized);

    const { error } = await this.supabase
      .from(normalizedSubCollection)
      .update(resolvedPayload as any)
      .eq('id', subDocId)
      .eq(parentIdField, parentDocId);

    if (error) {
      throw new Error(`Failed to update subdocument: ${error.message}`);
    }
  }

  async deleteDoc(collection: string, docId: string): Promise<void> {
    const normalizedCollection = normalizeTableName(collection);
    const { error } = await this.supabase
      .from(normalizedCollection)
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
    const parentIdField = this.buildParentIdField(parentCollection);

    const normalizedSubCollection = normalizeTableName(subCollection);
    const { error } = await this.supabase
      .from(normalizedSubCollection)
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

    const normalizedCollection = normalizeTableName(collection);

    // Initial fetch
    this.getDoc<T>(collection, docId).then(callback).catch(error => {
      if (onError) onError(error);
    });

    // Subscribe to changes
    const channel = this.supabase
      .channel(`${normalizedCollection}:${docId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: normalizedCollection,
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

    const normalizedCollection = normalizeTableName(collection);

    // Initial fetch
    this.getDocs<T>(collection, ...constraints).then(callback).catch(error => {
      if (onError) onError(error);
    });

    // Subscribe to all changes in the collection
    // Note: Filtering on client side as Supabase realtime doesn't support complex filters
    const channel = this.supabase
      .channel(`${normalizedCollection}:all`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: normalizedCollection
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

    const parentIdField = this.buildParentIdField(parentCollection);
    const normalizedSubCollection = normalizeTableName(subCollection);

    // Initial fetch
    this.getSubDocs<T>(parentCollection, parentDocId, subCollection, ...constraints)
      .then(callback)
      .catch(error => {
        if (onError) onError(error);
      });

    // Subscribe to changes
    const channel = this.supabase
      .channel(`${normalizedSubCollection}:${parentDocId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: normalizedSubCollection,
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
      setInSubcollection: <T>(parentCollection: string, subCollection: string, docId: string, data: T) => {
        operations.push(async () => {
          const parsed = this.parseParentCollection(parentCollection);
          const payload = { ...data } as any;
          if (parsed.parentUserId) payload.user_id = parsed.parentUserId;
          await this.setSubDoc(parsed.collection, parsed.parentDocId, subCollection, docId, payload);
        });
      },
      updateInSubcollection: <T>(parentCollection: string, subCollection: string, docId: string, data: Partial<T>) => {
        operations.push(async () => {
          const parsed = this.parseParentCollection(parentCollection);
          await this.updateSubDoc(parsed.collection, parsed.parentDocId, subCollection, docId, data);
        });
      },
      deleteInSubcollection: (parentCollection: string, subCollection: string, docId: string) => {
        operations.push(async () => {
          const parsed = this.parseParentCollection(parentCollection);
          await this.deleteSubDoc(parsed.collection, parsed.parentDocId, subCollection, docId);
        });
      },
      commit: async () => {
        // Execute all operations sequentially to preserve dependency order.
        // Supabase does not provide a Firestore-style batch transaction, so
        // writing dependent rows in order avoids foreign key races.
        for (const op of operations) {
          await op();
        }
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
