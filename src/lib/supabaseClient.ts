import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (typeof window !== 'undefined') {
  console.info('[DEBUG] Supabase runtime config', {
    url: supabaseUrl,
    anonKeyConfigured: Boolean(supabaseAnonKey),
    anonKeyLength: supabaseAnonKey?.length ?? 0,
    publishableKeyConfigured: Boolean(supabasePublishableKey),
    publishableKeyLength: supabasePublishableKey?.length ?? 0,
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
