'use server';

/**
 * Debug endpoint for diagnosing Strava OAuth cookie / env problems on Netlify.
 *
 * WARNING: This endpoint intentionally DOES NOT return secret values.
 * It only returns booleans showing whether required environment variables
 * are present and a masked version of the strava_id_token if available.
 *
 * Usage:
 *  - GET /api/debug            => run diagnostics
 *  - GET /api/debug?set=1      => set a short-lived test cookie (debug_test) and run diagnostics
 */

import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const stravaCookie = cookieStore.get('strava_id_token')?.value || null;
    const debugCookie = cookieStore.get('debug_test')?.value || null;

    const url = new URL(request.url);
    const set = url.searchParams.get('set');

    const envFlags = {
      NEXT_PUBLIC_STRAVA_CLIENT_ID: !!process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      STRAVA_CLIENT_SECRET: !!process.env.STRAVA_CLIENT_SECRET,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_BASE_URL: !!process.env.NEXT_PUBLIC_BASE_URL,
    };

    const payload = {
      cookieSeenByServer: !!stravaCookie,
      stravaCookieMasked: stravaCookie ? `${stravaCookie.slice(0, 6)}...${stravaCookie.slice(-6)}` : null,
      debugCookie: !!debugCookie,
      computedRedirectUri: (() => {
        try {
          return `${request.nextUrl.origin}/api/strava/token-exchange`;
        } catch {
          return 'unknown';
        }
      })(),
      envFlags,
      serverTime: new Date().toISOString(),
    };

    const res = NextResponse.json(payload);

    if (set === '1') {
      // Set a short-lived test cookie (useful to validate that cookies persist through cross-site redirect)
      res.cookies.set('debug_test', '1', {
        httpOnly: false,
        sameSite: 'none',
        secure: true,
        path: '/',
        maxAge: 60, // seconds
      });
    }

    return res;
  } catch (err) {
    return NextResponse.json({ error: 'Debug endpoint failed', details: String(err) }, { status: 500 });
  }
}
