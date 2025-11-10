/**
 * Authentication Provider Interface
 * Abstracts authentication operations across different backend providers
 */

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  getIdToken: () => Promise<string>;
}

export interface AuthCredential {
  email: string;
  password: string;
}

export interface UserUpdateProfile {
  displayName?: string;
  photoURL?: string;
}

export interface IAuthProvider {
  /**
   * Subscribe to authentication state changes
   * @param callback Function called when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;

  /**
   * Sign in with email and password
   */
  signInWithEmailAndPassword(email: string, password: string): Promise<AuthUser>;

  /**
   * Create a new user with email and password
   */
  createUserWithEmailAndPassword(email: string, password: string): Promise<AuthUser>;

  /**
   * Send email verification to current user
   */
  sendEmailVerification(user: AuthUser): Promise<void>;

  /**
   * Apply an action code (e.g., email verification)
   */
  applyActionCode(code: string): Promise<void>;

  /**
   * Update user profile
   */
  updateProfile(user: AuthUser, profile: UserUpdateProfile): Promise<void>;

  /**
   * Sign out current user
   */
  signOut(): Promise<void>;

  /**
   * Get current authenticated user
   */
  getCurrentUser(): AuthUser | null;

  /**
   * Server-side: Verify ID token
   */
  verifyIdToken(token: string): Promise<{
    uid: string;
    email?: string;
    email_verified?: boolean;
  }>;

  /**
   * Server-side: Create session cookie
   */
  createSessionCookie(idToken: string, expiresIn: number): Promise<string>;

  /**
   * Server-side: Verify session cookie
   */
  verifySessionCookie(sessionCookie: string): Promise<{
    uid: string;
    email?: string;
  }>;

  /**
   * Get the client-side auth instance (for framework-specific needs)
   */
  getAuthInstance(): any;
}
