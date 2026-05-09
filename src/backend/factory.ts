/**
 * Backend Factory
 *
 * Simple, Supabase-only backend adapter factory for client and server.
 */

import type { IAuthProvider, IDatabase, IStorage } from './interfaces';
import { SupabaseAuthAdapter } from './supabase/SupabaseAuthAdapter';
import { SupabaseDbAdapter } from './supabase/SupabaseDbAdapter';
import { SupabaseStorageAdapter } from './supabase/SupabaseStorageAdapter';

// Singleton adapter instances for supabase
let currentAuthAdapter: SupabaseAuthAdapter | null = null;
let currentDbAdapter: SupabaseDbAdapter | null = null;
let currentStorageAdapter: SupabaseStorageAdapter | null = null;
let serverAuthAdapter: SupabaseAuthAdapter | null = null;
let serverDbAdapter: SupabaseDbAdapter | null = null;
let serverStorageAdapter: SupabaseStorageAdapter | null = null;

function getAdapterInstances(isServer: boolean) {
  if (isServer) {
    if (!serverAuthAdapter) serverAuthAdapter = new SupabaseAuthAdapter(true);
    if (!serverDbAdapter) serverDbAdapter = new SupabaseDbAdapter(true);
    if (!serverStorageAdapter) serverStorageAdapter = new SupabaseStorageAdapter();

    return {
      auth: serverAuthAdapter,
      db: serverDbAdapter,
      storage: serverStorageAdapter,
    };
  }

  if (!currentAuthAdapter) currentAuthAdapter = new SupabaseAuthAdapter(false);
  if (!currentDbAdapter) currentDbAdapter = new SupabaseDbAdapter(false);
  if (!currentStorageAdapter) currentStorageAdapter = new SupabaseStorageAdapter();

  return {
    auth: currentAuthAdapter,
    db: currentDbAdapter,
    storage: currentStorageAdapter,
  };
}

/**
 * Get all backend services (single Supabase backend)
 */
export async function getBackendServices(): Promise<{
  auth: SupabaseAuthAdapter;
  db: SupabaseDbAdapter;
  storage: SupabaseStorageAdapter;
}> {
  const adapters = getAdapterInstances(false);
  return {
    auth: adapters.auth,
    db: adapters.db,
    storage: adapters.storage,
  };
}

/**
 * Get client-side authentication provider
 */
export async function getAuth(): Promise<SupabaseAuthAdapter> {
  return getAdapterInstances(false).auth;
}

/**
 * Get client-side database provider
 */
export async function getDb(): Promise<SupabaseDbAdapter> {
  return getAdapterInstances(false).db;
}

/**
 * Get client-side storage provider
 */
export async function getStorage(): Promise<SupabaseStorageAdapter> {
  return getAdapterInstances(false).storage;
}

/**
 * Get server-side authentication provider (with admin privileges)
 */
export async function getServerAuth(): Promise<IAuthProvider> {
  return getAdapterInstances(true).auth;
}

/**
 * Get server-side database provider (with admin privileges)
 */
export async function getServerDb(): Promise<IDatabase> {
  return getAdapterInstances(true).db;
}

/**
 * Get the name of the current backend provider
 */
export function getBackendProvider(): string {
  return getBackendProviderName();
}

/**
 * Reset all backend instances (useful for testing)
 */
export function resetBackend(): void {
  if (currentAuthAdapter?.destroy) {
    currentAuthAdapter.destroy();
  }
  if (currentDbAdapter?.destroy) {
    currentDbAdapter.destroy();
  }
  if (currentStorageAdapter?.destroy) {
    currentStorageAdapter.destroy();
  }
  currentAuthAdapter = null;
  currentDbAdapter = null;
  currentStorageAdapter = null;
}

/**
 * Reset server backend instances (useful for testing)
 */
export function resetServerBackend(): void {
  if (serverAuthAdapter?.destroy) {
    serverAuthAdapter.destroy();
  }
  if (serverDbAdapter?.destroy) {
    serverDbAdapter.destroy();
  }
  if (serverStorageAdapter?.destroy) {
    serverStorageAdapter.destroy();
  }
  serverAuthAdapter = null;
  serverDbAdapter = null;
  serverStorageAdapter = null;
}

/**
 * Reset all backend instances (client and server)
 */
export function resetAllBackends(): void {
  resetBackend();
  resetServerBackend();
}
