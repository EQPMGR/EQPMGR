/**
 * Firebase Backend Provider
 *
 * Self-contained Firebase backend implementation.
 * Handles initialization, configuration, and provides all Firebase services.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth as getFirebaseAuth, type Auth } from 'firebase/auth';
import { getStorage as getFirebaseStorage, type FirebaseStorage } from 'firebase/storage';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

import type { IBackendProvider, IAuthProvider, IDatabase, IStorage } from '../interfaces';
import { FirebaseAuthAdapter } from './FirebaseAuthAdapter';
import { FirebaseDbAdapter } from './FirebaseDbAdapter';
import { FirebaseStorageAdapter } from './FirebaseStorageAdapter';
import { getClientConfig, getProjectId } from './config';

// Type imports for admin SDK (no runtime dependency)
type AdminAuth = import('firebase-admin').auth.Auth;
type AdminFirestore = import('firebase-admin').firestore.Firestore;

export class FirebaseProvider implements IBackendProvider {
  readonly name = 'firebase';

  // Client-side instances
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private storage: FirebaseStorage | null = null;

  // Server-side instances
  private adminInitialized = false;
  private adminAuth: AdminAuth | null = null;
  private adminDb: AdminFirestore | null = null;

  // Adapters (lazy-initialized)
  private authAdapter: FirebaseAuthAdapter | null = null;
  private dbAdapter: FirebaseDbAdapter | null = null;
  private storageAdapter: FirebaseStorageAdapter | null = null;
  private serverAuthAdapter: FirebaseAuthAdapter | null = null;
  private serverDbAdapter: FirebaseDbAdapter | null = null;

  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Client-side initialization
    if (typeof window !== 'undefined') {
      await this.initializeClient();
    }

    // Server-side initialization
    if (typeof window === 'undefined') {
      await this.initializeAdmin();
    }

    this.initialized = true;
  }

  /**
   * Initialize Firebase client SDK
   */
  private async initializeClient(): Promise<void> {
    // Check if already initialized
    if (getApps().length > 0) {
      this.app = getApp();
      this.auth = getFirebaseAuth(this.app);
      this.db = getFirestore(this.app);
      this.storage = getFirebaseStorage(this.app);
      return;
    }

    // Fetch configuration from server
    const config = await getClientConfig();

    // Initialize Firebase
    this.app = initializeApp(config);
    this.auth = getFirebaseAuth(this.app);
    this.db = getFirestore(this.app);
    this.storage = getFirebaseStorage(this.app);

    // Initialize Analytics if supported
    if (typeof window !== 'undefined') {
      isSupported().then((supported) => {
        if (supported && this.app) {
          getAnalytics(this.app);
        }
      });
    }
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private async initializeAdmin(): Promise<void> {
    if (this.adminInitialized) {
      return;
    }

    // Dynamically import firebase-admin (server-side only)
    const admin = await import('firebase-admin');
    const adminModule = admin.default || admin;

    // Only initialize if it hasn't been already
    if (!adminModule.apps.length) {
      const projectId = getProjectId();

      adminModule.initializeApp({
        projectId: projectId,
      });
    }

    this.adminAuth = adminModule.auth();
    this.adminDb = adminModule.firestore();
    this.adminInitialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getAuth(): IAuthProvider {
    if (!this.authAdapter) {
      this.authAdapter = new FirebaseAuthAdapter(false);
    }
    return this.authAdapter;
  }

  getDb(): IDatabase {
    if (!this.dbAdapter) {
      this.dbAdapter = new FirebaseDbAdapter(false);
    }
    return this.dbAdapter;
  }

  getStorage(): IStorage {
    if (!this.storageAdapter) {
      this.storageAdapter = new FirebaseStorageAdapter();
    }
    return this.storageAdapter;
  }

  getServerAuth(): IAuthProvider {
    if (!this.serverAuthAdapter) {
      this.serverAuthAdapter = new FirebaseAuthAdapter(true);
    }
    return this.serverAuthAdapter;
  }

  getServerDb(): IDatabase {
    if (!this.serverDbAdapter) {
      this.serverDbAdapter = new FirebaseDbAdapter(true);
    }
    return this.serverDbAdapter;
  }

  /**
   * Clean up resources (for testing)
   */
  destroy(): void {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.storage = null;
    this.authAdapter = null;
    this.dbAdapter = null;
    this.storageAdapter = null;
    this.serverAuthAdapter = null;
    this.serverDbAdapter = null;
    this.initialized = false;
  }
}
