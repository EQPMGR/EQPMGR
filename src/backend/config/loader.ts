/**
 * Backend Configuration Loader
 *
 * Generic configuration loading system that delegates to the appropriate backend.
 * No if/else switching - uses object lookup for clean, extensible architecture.
 */

import type { BackendConfig } from '../interfaces/IBackendProvider';
import * as firebaseConfig from '../firebase/config';
import * as supabaseConfig from '../supabase/config';

/**
 * Registry of backend config loaders
 * To add a new backend, just add it here
 */
const CONFIG_LOADERS = {
  firebase: firebaseConfig,
  supabase: supabaseConfig,
} as const;

type BackendProviderName = keyof typeof CONFIG_LOADERS;

/**
 * Get the currently configured backend provider name
 */
export function getBackendProviderName(): BackendProviderName {
  const provider = process.env.NEXT_PUBLIC_BACKEND_PROVIDER || process.env.BACKEND_PROVIDER || 'firebase';

  if (!(provider in CONFIG_LOADERS)) {
    console.warn(`Unknown backend provider: ${provider}. Defaulting to firebase.`);
    return 'firebase';
  }

  return provider as BackendProviderName;
}

/**
 * Get backend configuration for server-side use
 * Called by /api/config route
 */
export function getBackendConfig(): BackendConfig {
  const providerName = getBackendProviderName();
  const configLoader = CONFIG_LOADERS[providerName];

  return configLoader.getServerConfig();
}

/**
 * Get backend configuration for client-side use
 * Fetches from /api/config endpoint
 */
export async function getClientBackendConfig(): Promise<BackendConfig> {
  const response = await fetch('/api/config');

  if (!response.ok) {
    throw new Error(`Failed to fetch backend configuration: ${response.statusText}`);
  }

  const config = await response.json();

  if (!config.provider) {
    throw new Error('Backend configuration is missing provider field');
  }

  return config;
}
