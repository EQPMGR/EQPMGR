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
function toAuthUser(supabaseUser: User, accessToken?: string): AuthUser {
  return {
    uid: supabaseUser.id,
    email: supabaseUser.email || null,
    emailVerified: supabaseUser.email_confirmed_at !== null,
    displayName: supabaseUser.user_metadata?.display_name || supabaseUser.user_metadata?.name || null,
    photoURL: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.photo_url || null,
    getIdToken: async () => {
      if (accessToken) {
        return accessToken;
      }

      // The session access_token is the ID token our server code verifies
      const sharedClients = getSharedSupabaseClients();
      const supabase = sharedClients.client ?? getSupabaseClient(false);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      return session.access_token;
    }
  };
}

function getEmailRedirectUrl(): string {
  const redirectPath = '/verify-email';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (baseUrl) {
    return new URL(redirectPath, baseUrl).toString();
  }

  if (typeof window !== 'undefined') {
    return new URL(redirectPath, window.location.origin).toString();
  }

  throw new Error('Unable to determine email redirect URL for Supabase. Set NEXT_PUBLIC_BASE_URL.');
}

type SharedSupabaseClients = {
  client?: SupabaseClient;
  server?: SupabaseClient;
};

const SHARED_CLIENT_KEY = '__eqpmgr_supabase_clients__';

function getSharedSupabaseClients(): SharedSupabaseClients {
  const globalScope = globalThis as typeof globalThis & { [SHARED_CLIENT_KEY]?: SharedSupabaseClients };
  if (!globalScope[SHARED_CLIENT_KEY]) {
    globalScope[SHARED_CLIENT_KEY] = {};
  }
  return globalScope[SHARED_CLIENT_KEY];
}

/**
 * Get or create Supabase client instance
 */
function getSupabaseClient(isServer: boolean): SupabaseClient {
  const sharedClients = getSharedSupabaseClients();

  if (isServer) {
    if (!sharedClients.server) {
      const config = getServerConfig();

      if (process.env.NODE_ENV !== 'production') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      const clientOptions: any = {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      };

      sharedClients.server = createClient(config.url, config.serviceRoleKey, clientOptions);
    }
    return sharedClients.server;
  }

  if (!sharedClients.client) {
    // For client-side, we need to get config from environment
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('Missing Supabase client configuration. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    sharedClients.client = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  }

  return sharedClients.client;
}

export class SupabaseAuthAdapter implements IAuthProvider {
  private supabase: SupabaseClient;
  private isServer: boolean;
  destroy?(): void;

  constructor(isServer: boolean = false) {
    this.isServer = isServer;
    this.supabase = getSupabaseClient(isServer);
  }

  private currentUser: AuthUser | null = null;

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    if (this.isServer) {
      console.warn('onAuthStateChanged called on server-side adapter - this is a no-op');
      return () => {};
    }

    // Call immediately with current user from existing session
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user ? toAuthUser(session.user, session.access_token) : null;
      this.currentUser = authUser;
      callback(authUser);
    }).catch((error) => {
      console.warn('getSession failed in onAuthStateChanged', error);
      callback(null);
    });

    // Subscribe to auth changes and keep local cache
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange((event, session) => {
      const authUser = session?.user ? toAuthUser(session.user, session.access_token) : null;
      this.currentUser = authUser;
      callback(authUser);
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
        emailRedirectTo: getEmailRedirectUrl()
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
        emailRedirectTo: getEmailRedirectUrl()
      }
    });

    if (error) {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }

  async applyActionCode(code: string): Promise<void> {
    // Supabase uses token_hash in URL params for email verification
    // The verification is automatically handled when user clicks the link
    // Kept to satisfy the IAuthProvider interface

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

    if (this.currentUser) {
      return this.currentUser;
    }

    // Try to populate from current session in the background
    this.supabase.auth.getSession().then(({ data, error }) => {
      if (!error && data?.session?.user) {
        this.currentUser = toAuthUser(data.session.user, data.session.access_token);
      }
    }).catch((error) => {
      console.warn('getCurrentUser: unable to fetch live session', error);
    });

    return this.currentUser;
  }

  async verifyIdToken(token: string, forceRefresh: boolean = false): Promise<{
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
    // Supabase has no separate session-cookie API
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
