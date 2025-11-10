/**
 * Backend Factory
 *
 * Clean, registry-based factory for backend providers.
 * No if/else switching - uses object lookup for extensibility.
 *
 * To add a new backend:
 * 1. Create a provider class implementing IBackendProvider
 * 2. Add it to BACKEND_REGISTRY below
 * 3. That's it! No other code changes needed.
 */

import type { IBackendProvider, IAuthProvider, IDatabase, IStorage } from './interfaces';
import { getBackendProviderName } from './config/loader';

/**
 * Backend Provider Registry
 *
 * This is the ONLY place where backend providers are listed.
 * Adding a new backend is as simple as adding it here.
 *
 * Using dynamic imports to avoid bundling server-side code (firebase-admin) in client bundle
 */
const BACKEND_REGISTRY = {
  firebase: () => import('./firebase/FirebaseProvider').then(m => m.FirebaseProvider),
  supabase: () => import('./supabase/SupabaseProvider').then(m => m.SupabaseProvider),
} as const;

type BackendProviderName = keyof typeof BACKEND_REGISTRY;

// Singleton instances
let currentProvider: IBackendProvider | null = null;
let serverProvider: IBackendProvider | null = null;

/**
 * Get the backend provider class for the configured backend
 */
async function getProviderClass(): Promise<typeof IBackendProvider> {
  const providerName = getBackendProviderName() as BackendProviderName;
  const providerLoader = BACKEND_REGISTRY[providerName];

  if (!providerLoader) {
    throw new Error(
      `Backend provider "${providerName}" not found in registry. ` +
      `Available providers: ${Object.keys(BACKEND_REGISTRY).join(', ')}`
    );
  }

  return await providerLoader();
}

/**
 * Initialize and get the client-side backend provider
 */
async function getProvider(): Promise<IBackendProvider> {
  if (currentProvider?.isInitialized()) {
    return currentProvider;
  }

  const ProviderClass = await getProviderClass();
  currentProvider = new ProviderClass();
  await currentProvider.initialize();

  return currentProvider;
}

/**
 * Initialize and get the server-side backend provider
 */
async function getServerProvider(): Promise<IBackendProvider> {
  if (serverProvider?.isInitialized()) {
    return serverProvider;
  }

  const ProviderClass = await getProviderClass();
  serverProvider = new ProviderClass();
  await serverProvider.initialize();

  return serverProvider;
}

/**
 * Get all backend services (client-side)
 */
export async function getBackendServices(): Promise<{
  auth: IAuthProvider;
  db: IDatabase;
  storage: IStorage;
}> {
  const provider = await getProvider();

  return {
    auth: provider.getAuth(),
    db: provider.getDb(),
    storage: provider.getStorage(),
  };
}

/**
 * Get client-side authentication provider
 */
export async function getAuth(): Promise<IAuthProvider> {
  const provider = await getProvider();
  return provider.getAuth();
}

/**
 * Get client-side database provider
 */
export async function getDb(): Promise<IDatabase> {
  const provider = await getProvider();
  return provider.getDb();
}

/**
 * Get client-side storage provider
 */
export async function getStorage(): Promise<IStorage> {
  const provider = await getProvider();
  return provider.getStorage();
}

/**
 * Get server-side authentication provider (with admin privileges)
 */
export async function getServerAuth(): Promise<IAuthProvider> {
  const provider = await getServerProvider();
  return provider.getServerAuth();
}

/**
 * Get server-side database provider (with admin privileges)
 */
export async function getServerDb(): Promise<IDatabase> {
  const provider = await getServerProvider();
  return provider.getServerDb();
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
  if (currentProvider?.destroy) {
    currentProvider.destroy();
  }
  currentProvider = null;
}

/**
 * Reset server backend instances (useful for testing)
 */
export function resetServerBackend(): void {
  if (serverProvider?.destroy) {
    serverProvider.destroy();
  }
  serverProvider = null;
}

/**
 * Reset all backend instances (client and server)
 */
export function resetAllBackends(): void {
  resetBackend();
  resetServerBackend();
}
