/**
 * Backend Provider Interface
 *
 * This interface defines the contract that all backend providers must implement.
 * Each backend (Firebase, Supabase, etc.) is a self-contained module that knows
 * how to initialize itself and provide auth, database, and storage services.
 *
 * Benefits of this approach:
 * - No if/else switching in application code
 * - Easy to add new backends (just implement interface and register)
 * - Each backend is fully encapsulated
 * - Type-safe and testable
 */

import type { IAuthProvider, IDatabase, IStorage } from './';

export interface IBackendProvider {
  /**
   * The unique name of this backend provider (e.g., 'firebase', 'supabase')
   */
  readonly name: string;

  /**
   * Initialize the backend provider.
   * This is called once when the provider is first accessed.
   * Should handle:
   * - Fetching configuration
   * - Initializing SDK/client
   * - Setting up any necessary state
   */
  initialize(): Promise<void>;

  /**
   * Check if the provider has been initialized
   */
  isInitialized(): boolean;

  /**
   * Get the client-side authentication provider
   */
  getAuth(): IAuthProvider;

  /**
   * Get the client-side database provider
   */
  getDb(): IDatabase;

  /**
   * Get the client-side storage provider
   */
  getStorage(): IStorage;

  /**
   * Get the server-side authentication provider (with admin privileges)
   */
  getServerAuth(): IAuthProvider;

  /**
   * Get the server-side database provider (with admin privileges)
   */
  getServerDb(): IDatabase;

  /**
   * Clean up resources (optional, for testing)
   */
  destroy?(): void;
}

/**
 * Backend Configuration
 * Generic configuration interface that all backends must provide
 */
export interface BackendConfig {
  provider: string;
  [key: string]: any;
}

/**
 * Backend Config Loader
 * Each backend must implement a function that returns its configuration
 */
export interface IBackendConfigLoader {
  /**
   * Get client-side configuration (safe to expose to browser)
   */
  getClientConfig(): Promise<BackendConfig>;

  /**
   * Get server-side configuration (includes secrets)
   */
  getServerConfig(): BackendConfig;
}
