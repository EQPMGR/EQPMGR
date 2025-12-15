// Debug endpoint to diagnose Strava OAuth cookie and environment variable issues in production (Netlify).
// Usage: GET /api/debug - Returns diagnostic information about cookies and environment variables
//        GET /api/debug?set=1 - Sets a test cookie and returns diagnostic information
// Purpose: Helps identify missing env vars or cookie visibility issues that cause 500 errors during Strava token exchange.

import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldSetCookie = searchParams.get('set') === '1';
    
    // Read cookies
    const cookieStore = await cookies();
    const stravaIdToken = cookieStore.get('strava_id_token')?.value;
    const debugTestCookie = cookieStore.get('debug_test')?.value;
    
    // Mask the strava_id_token if present (show first 8 and last 8 chars)
    let maskedStravaToken: string | null = null;
    if (stravaIdToken) {
      if (stravaIdToken.length > 16) {
        maskedStravaToken = `${stravaIdToken.slice(0, 8)}...${stravaIdToken.slice(-8)}`;
      } else {
        maskedStravaToken = '***masked***';
      }
    }
    
    // Compute redirect URI
    const redirectUri = `${request.nextUrl.origin}/api/strava/token-exchange`;
    
    // Check environment variables (only check presence, don't return values)
    const envVars = {
      NEXT_PUBLIC_STRAVA_CLIENT_ID: !!process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      STRAVA_CLIENT_SECRET: !!process.env.STRAVA_CLIENT_SECRET,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_BASE_URL: !!process.env.NEXT_PUBLIC_BASE_URL,
    };
    
    // Prepare response
    const response = NextResponse.json({
      cookies: {
        strava_id_token_present: !!stravaIdToken,
        strava_id_token_masked: maskedStravaToken,
        debug_test_cookie_present: !!debugTestCookie,
        debug_test_cookie_value: debugTestCookie || null,
      },
      redirectUri,
      environmentVariables: envVars,
      timestamp: new Date().toISOString(),
    });
    
    // Optionally set a test cookie
    if (shouldSetCookie) {
      response.cookies.set('debug_test', `test_${Date.now()}`, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 60, // 60 seconds
      });
    }
    
    return response;
    
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Debug endpoint failed',
        message: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
