/**
 * Supabase Configuration Module
 *
 * Handles all Supabase configuration loading and validation.
 * This module knows how to fetch and validate Supabase-specific config.
 */

import type { BackendConfig } from '../interfaces/IBackendProvider';

export interface SupabaseConfig extends BackendConfig {
  provider: 'supabase';
  url: string;
  anonKey: string;
}

export interface SupabaseServerConfig extends SupabaseConfig {
  serviceRoleKey: string;
}

/**
 * Fetch Supabase configuration from the server
 * This is called client-side to get the config
 */
export async function getClientConfig(): Promise<SupabaseConfig> {
  const response = await fetch('/api/config');

  if (!response.ok) {
    throw new Error('Failed to fetch Supabase configuration from server');
  }

  const config = await response.json();

  if (config.provider !== 'supabase') {
    throw new Error(`Expected Supabase config but got: ${config.provider}`);
  }

  validateSupabaseConfig(config);
  return config as SupabaseConfig;
}

/**
 * Get Supabase configuration for server-side use
 * Reads directly from environment variables
 */
export function getServerConfig(): SupabaseServerConfig {
  const config: SupabaseServerConfig = {
    provider: 'supabase',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };

  validateSupabaseServerConfig(config);
  return config;
}

/**
 * Validate that required Supabase configuration fields are present
 */
function validateSupabaseConfig(config: any): asserts config is SupabaseConfig {
  if (!config.url || !config.anonKey) {
    console.error('Invalid Supabase configuration:', config);
    throw new Error(
      'Supabase configuration is missing required fields (url, anonKey). ' +
      'Check your environment variables.'
    );
  }
}

/**
 * Validate server-side Supabase configuration
 */
function validateSupabaseServerConfig(config: any): asserts config is SupabaseServerConfig {
  validateSupabaseConfig(config);

  if (!config.serviceRoleKey) {
    console.error('Invalid Supabase server configuration:', config);
    throw new Error(
      'Supabase server configuration is missing serviceRoleKey. ' +
      'Check your SUPABASE_SERVICE_ROLE_KEY environment variable.'
    );
  }
}
