/**
 * Supabase Backend Provider
 *
 * Self-contained Supabase backend implementation.
 * Handles initialization, configuration, and provides all Supabase services.
 *
 * TODO: Full implementation pending Supabase setup
 */

import type { IBackendProvider, IAuthProvider, IDatabase, IStorage } from '../interfaces';
import { SupabaseAuthAdapter } from './SupabaseAuthAdapter';
import { SupabaseDbAdapter } from './SupabaseDbAdapter';
import { SupabaseStorageAdapter } from './SupabaseStorageAdapter';
import { getClientConfig, getServerConfig } from './config';

export class SupabaseProvider implements IBackendProvider {
  readonly name = 'supabase';

  // Adapters (lazy-initialized)
  private authAdapter: SupabaseAuthAdapter | null = null;
  private dbAdapter: SupabaseDbAdapter | null = null;
  private storageAdapter: SupabaseStorageAdapter | null = null;
  private serverAuthAdapter: SupabaseAuthAdapter | null = null;
  private serverDbAdapter: SupabaseDbAdapter | null = null;

  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Client-side initialization
      if (typeof window !== 'undefined') {
        await this.initializeClient();
      }

      // Server-side initialization
      if (typeof window === 'undefined') {
        this.initializeServer();
      }

      this.initialized = true;
      console.log('SupabaseProvider initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SupabaseProvider:', error);
      throw error;
    }
  }

  /**
   * Initialize Supabase client SDK
   */
  private async initializeClient(): Promise<void> {
    try {
      // Fetch configuration from server
      const config = await getClientConfig();

      // Validate configuration
      if (!config.url || !config.anonKey) {
        throw new Error('Invalid Supabase client configuration');
      }

      console.log('Supabase client initialized:', config.url);

      // Adapters are lazy-loaded when accessed via getAuth(), getDb(), etc.
    } catch (error) {
      console.error('Supabase client initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Supabase for server-side use
   */
  private initializeServer(): void {
    try {
      // Get server configuration
      const config = getServerConfig();

      // Validate configuration
      if (!config.url || !config.anonKey || !config.serviceRoleKey) {
        throw new Error('Invalid Supabase server configuration');
      }

      console.log('Supabase server initialized:', config.url);

      // Adapters are lazy-loaded when accessed via getServerAuth(), getServerDb(), etc.
    } catch (error) {
      console.error('Supabase server initialization failed:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getAuth(): IAuthProvider {
    if (!this.authAdapter) {
      this.authAdapter = new SupabaseAuthAdapter(false);
    }
    return this.authAdapter;
  }

  getDb(): IDatabase {
    if (!this.dbAdapter) {
      this.dbAdapter = new SupabaseDbAdapter(false);
    }
    return this.dbAdapter;
  }

  getStorage(): IStorage {
    if (!this.storageAdapter) {
      this.storageAdapter = new SupabaseStorageAdapter();
    }
    return this.storageAdapter;
  }

  getServerAuth(): IAuthProvider {
    if (!this.serverAuthAdapter) {
      this.serverAuthAdapter = new SupabaseAuthAdapter(true);
    }
    return this.serverAuthAdapter;
  }

  getServerDb(): IDatabase {
    if (!this.serverDbAdapter) {
      this.serverDbAdapter = new SupabaseDbAdapter(true);
    }
    return this.serverDbAdapter;
  }

  /**
   * Clean up resources (for testing)
   */
  destroy(): void {
    this.authAdapter = null;
    this.dbAdapter = null;
    this.storageAdapter = null;
    this.serverAuthAdapter = null;
    this.serverDbAdapter = null;
    this.initialized = false;
  }
}
