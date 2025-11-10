/**
 * Backend Abstraction Layer
 * Main entry point for backend services
 */

// Export factory functions
export {
  getBackendServices,
  getAuth,
  getDb,
  getStorage,
  getServerAuth,
  getServerDb,
  getBackendProvider,
  resetBackend,
  resetServerBackend,
  resetAllBackends,
} from './factory';

// Export interfaces
export * from './interfaces';

// Export common types
export * from './types';

// Export config loader
export { getBackendConfig, getClientBackendConfig, getBackendProviderName } from './config/loader';
