/**
 * Supabase Authentication Adapter
 * Implements IAuthProvider interface using Supabase Auth
 */

import type { IAuthProvider, AuthUser, UserUpdateProfile } from '../interfaces';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { getServerConfig } from './config';

/**
 * Convert Supabase User to AuthUser interface
 */
function toAuthUser(supabaseUser: User): AuthUser {
  return {
    uid: supabaseUser.id,
    email: supabaseUser.email || null,
    emailVerified: supabaseUser.email_confirmed_at !== null,
    displayName: supabaseUser.user_metadata?.display_name || supabaseUser.user_metadata?.name || null,
    photoURL: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.photo_url || null,
    getIdToken: async () => {
      // In Supabase, we use the session access_token as the equivalent of Firebase ID token
      const { data: { session } } = await clientInstance!.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      return session.access_token;
    }
  };
}

// Singleton Supabase client instance (client-side)
let clientInstance: SupabaseClient | null = null;

// Singleton Supabase client instance (server-side with service role)
let serverInstance: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 */
function getSupabaseClient(isServer: boolean): SupabaseClient {
  if (isServer) {
    if (!serverInstance) {
      const config = getServerConfig();
      serverInstance = createClient(config.url, config.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }
    return serverInstance;
  } else {
    if (!clientInstance) {
      // For client-side, we need to get config from environment
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !anonKey) {
        throw new Error('Missing Supabase client configuration. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }

      clientInstance = createClient(url, anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      });
    }
    return clientInstance;
  }
}

export class SupabaseAuthAdapter implements IAuthProvider {
  private supabase: SupabaseClient;
  private isServer: boolean;

  constructor(isServer: boolean = false) {
    this.isServer = isServer;
    this.supabase = getSupabaseClient(isServer);
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    if (this.isServer) {
      console.warn('onAuthStateChanged called on server-side adapter - this is a no-op');
      return () => {};
    }

    // Call immediately with current user
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      callback(session?.user ? toAuthUser(session.user) : null);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ? toAuthUser(session.user) : null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Sign in failed: No user returned');
    }

    return toAuthUser(data.user);
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/verify-email`
      }
    });

    if (error) {
      throw new Error(`Sign up failed: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Sign up failed: No user returned');
    }

    return toAuthUser(data.user);
  }

  async sendEmailVerification(user: AuthUser): Promise<void> {
    if (!user.email) {
      throw new Error('Cannot send verification to user without email');
    }

    // Supabase sends verification email automatically on signup
    // To resend, we use the resend endpoint
    const { error } = await this.supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/verify-email`
      }
    });

    if (error) {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }

  async applyActionCode(code: string): Promise<void> {
    // Supabase uses token_hash in URL params for email verification
    // The verification is automatically handled when user clicks the link
    // This method is primarily for Firebase compatibility

    // In Supabase, verification happens via the email link with token_hash
    // If we need to manually verify, we'd use exchangeCodeForSession
    const { error } = await this.supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw new Error(`Email verification failed: ${error.message}`);
    }
  }

  async updateProfile(user: AuthUser, profile: UserUpdateProfile): Promise<void> {
    const updates: any = {};

    if (profile.displayName !== undefined) {
      updates.display_name = profile.displayName;
    }

    if (profile.photoURL !== undefined) {
      updates.avatar_url = profile.photoURL;
    }

    const { error } = await this.supabase.auth.updateUser({
      data: updates
    });

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  }

  getCurrentUser(): AuthUser | null {
    if (this.isServer) {
      console.warn('getCurrentUser called on server-side adapter - returning null');
      return null;
    }

    // This is synchronous and may not have the latest session
    // For client-side, we should ideally use onAuthStateChanged
    // But we provide a best-effort implementation
    const { data: { user } } = this.supabase.auth.getUser() as any;

    return user ? toAuthUser(user) : null;
  }

  async verifyIdToken(token: string): Promise<{
    uid: string;
    email?: string;
    email_verified?: boolean;
  }> {
    if (!this.isServer) {
      throw new Error('verifyIdToken should only be called server-side');
    }

    // Verify the JWT token
    const { data: { user }, error } = await this.supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error(`Token verification failed: ${error?.message || 'Invalid token'}`);
    }

    return {
      uid: user.id,
      email: user.email,
      email_verified: user.email_confirmed_at !== null
    };
  }

  async createSessionCookie(idToken: string, expiresIn: number): Promise<string> {
    // Supabase doesn't have direct session cookie creation like Firebase
    // Instead, we return the JWT token itself which can be used as a session token
    // The expiration is handled by the JWT's exp claim

    // Verify the token is valid first
    await this.verifyIdToken(idToken);

    // In a real implementation, you might want to create a server-side session
    // and return a session ID. For now, we return the token itself.
    return idToken;
  }

  async verifySessionCookie(sessionCookie: string): Promise<{
    uid: string;
    email?: string;
  }> {
    // For our implementation, session cookie is just the JWT token
    const result = await this.verifyIdToken(sessionCookie);

    return {
      uid: result.uid,
      email: result.email
    };
  }

  getAuthInstance(): SupabaseClient {
    return this.supabase;
  }
}
