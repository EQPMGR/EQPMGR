/**
 * Firebase Configuration Module
 *
 * Handles all Firebase configuration loading and validation.
 * This module knows how to fetch and validate Firebase-specific config.
 */

import type { BackendConfig } from '../interfaces/IBackendProvider';

export interface FirebaseConfig extends BackendConfig {
  provider: 'firebase';
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

/**
 * Fetch Firebase configuration from the server
 * This is called client-side to get the config
 */
export async function getClientConfig(): Promise<FirebaseConfig> {
  const response = await fetch('/api/config');

  if (!response.ok) {
    throw new Error('Failed to fetch Firebase configuration from server');
  }

  const config = await response.json();

  if (config.provider !== 'firebase') {
    throw new Error(`Expected Firebase config but got: ${config.provider}`);
  }

  validateFirebaseConfig(config);
  return config as FirebaseConfig;
}

/**
 * Get Firebase configuration for server-side use
 * Reads directly from environment variables
 */
export function getServerConfig(): FirebaseConfig {
  const config: FirebaseConfig = {
    provider: 'firebase',
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
    authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  validateFirebaseConfig(config);
  return config;
}

/**
 * Validate that required Firebase configuration fields are present
 */
function validateFirebaseConfig(config: any): asserts config is FirebaseConfig {
  if (!config.apiKey || !config.projectId) {
    console.error('Invalid Firebase configuration:', config);
    throw new Error(
      'Firebase configuration is missing required fields (apiKey, projectId). ' +
      'Check your environment variables.'
    );
  }
}

/**
 * Get Firebase project ID from environment
 * Used for admin SDK initialization
 */
export function getProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      'FIREBASE_PROJECT_ID environment variable is not set. ' +
      'Admin SDK cannot be initialized.'
    );
  }

  return projectId;
}
