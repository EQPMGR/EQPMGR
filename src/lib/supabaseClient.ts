import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const SHARED_CLIENT_KEY = '__eqpmgr_supabase_singleton__';
const globalScope = globalThis as typeof globalThis & { [SHARED_CLIENT_KEY]?: ReturnType<typeof createClient> };

if (typeof window !== 'undefined') {
  console.info('[DEBUG] Supabase runtime config', {
    url: supabaseUrl,
    anonKeyConfigured: Boolean(supabaseAnonKey),
    anonKeyLength: supabaseAnonKey?.length ?? 0,
    publishableKeyConfigured: Boolean(supabasePublishableKey),
    publishableKeyLength: supabasePublishableKey?.length ?? 0,
  });
}

if (!globalScope[SHARED_CLIENT_KEY] && supabaseUrl && supabaseAnonKey) {
  globalScope[SHARED_CLIENT_KEY] = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = globalScope[SHARED_CLIENT_KEY] ?? createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
