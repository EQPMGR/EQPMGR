/**
 * Firebase Authentication Adapter
 * Implements IAuthProvider interface using Firebase Auth
 */

import {
  Auth,
  User,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  updateProfile as firebaseUpdateProfile,
  sendEmailVerification as firebaseSendEmailVerification,
  applyActionCode as firebaseApplyActionCode,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import admin from 'firebase-admin';
import { getFirebaseServices } from '@/lib/firebase';
import { getAdminAuth } from '@/lib/firebase-admin';
import type { IAuthProvider, AuthUser, UserUpdateProfile } from '../interfaces';

export class FirebaseAuthAdapter implements IAuthProvider {
  private auth: Auth | null = null;
  private adminAuth: admin.auth.Auth | null = null;
  private isServer: boolean;

  constructor(isServer: boolean = false) {
    this.isServer = isServer;

    if (isServer) {
      // Server-side: use admin SDK
      this.adminAuth = getAdminAuth();
    } else {
      // Client-side: initialize on first use (lazy loading)
      // We don't initialize here because getFirebaseServices is async
    }
  }

  /**
   * Ensure Firebase client SDK is initialized
   */
  private async ensureAuth(): Promise<Auth> {
    if (!this.auth) {
      const services = await getFirebaseServices();
      this.auth = services.auth;
    }
    return this.auth;
  }

  /**
   * Convert Firebase User to AuthUser
   */
  private convertUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      getIdToken: (forceRefresh?: boolean) => user.getIdToken(forceRefresh),
    };
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    if (this.isServer) {
      throw new Error('onAuthStateChanged is not available in server context');
    }

    let unsubscribe: (() => void) | null = null;

    // Initialize auth and set up listener
    this.ensureAuth().then((auth) => {
      unsubscribe = firebaseOnAuthStateChanged(auth, (firebaseUser) => {
        const user = firebaseUser ? this.convertUser(firebaseUser) : null;
        callback(user);
      });
    });

    // Return unsubscribe function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<AuthUser> {
    const auth = await this.ensureAuth();
    const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, password);
    return this.convertUser(userCredential.user);
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<AuthUser> {
    const auth = await this.ensureAuth();
    const userCredential = await firebaseCreateUserWithEmailAndPassword(auth, email, password);
    return this.convertUser(userCredential.user);
  }

  async sendEmailVerification(user: AuthUser): Promise<void> {
    const auth = await this.ensureAuth();
    // Get the actual Firebase user from auth
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || firebaseUser.uid !== user.uid) {
      throw new Error('User mismatch or not authenticated');
    }
    await firebaseSendEmailVerification(firebaseUser);
  }

  async applyActionCode(code: string): Promise<void> {
    const auth = await this.ensureAuth();
    await firebaseApplyActionCode(auth, code);
  }

  async updateProfile(user: AuthUser, profile: UserUpdateProfile): Promise<void> {
    const auth = await this.ensureAuth();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || firebaseUser.uid !== user.uid) {
      throw new Error('User mismatch or not authenticated');
    }
    await firebaseUpdateProfile(firebaseUser, profile);
  }

  async signOut(): Promise<void> {
    const auth = await this.ensureAuth();
    await firebaseSignOut(auth);
  }

  getCurrentUser(): AuthUser | null {
    if (this.isServer) {
      throw new Error('getCurrentUser is not available in server context');
    }
    if (!this.auth) {
      return null;
    }
    const firebaseUser = this.auth.currentUser;
    return firebaseUser ? this.convertUser(firebaseUser) : null;
  }

  async verifyIdToken(token: string): Promise<{
    uid: string;
    email?: string;
    email_verified?: boolean;
  }> {
    if (!this.isServer || !this.adminAuth) {
      throw new Error('verifyIdToken is only available in server context');
    }

    const decodedToken = await this.adminAuth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
    };
  }

  async createSessionCookie(idToken: string, expiresIn: number): Promise<string> {
    if (!this.isServer || !this.adminAuth) {
      throw new Error('createSessionCookie is only available in server context');
    }

    return await this.adminAuth.createSessionCookie(idToken, { expiresIn });
  }

  async verifySessionCookie(sessionCookie: string): Promise<{
    uid: string;
    email?: string;
  }> {
    if (!this.isServer || !this.adminAuth) {
      throw new Error('verifySessionCookie is only available in server context');
    }

    const decodedClaims = await this.adminAuth.verifySessionCookie(sessionCookie);
    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email,
    };
  }

  getAuthInstance(): Auth | admin.auth.Auth | null {
    return this.isServer ? this.adminAuth : this.auth;
  }
}
