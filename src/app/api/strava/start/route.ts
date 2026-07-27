import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerAuth } from '@/backend';
import { accessSecret } from '@/lib/secrets';

/**
 * Strava OAuth Step 1: Request Authorization
 * 
 * Follows https://developers.strava.com/docs/authentication/#requesting-access
 * 
 * Endpoint: POST /api/strava/start
 * Body: { idToken: string, redirectPath?: string }
 * Response: { url: string } - Redirect user to this URL
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, redirectPath = '/' } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid idToken' }, { status: 400 });
    }

    // Verify the user's Firebase token
    const auth = await getServerAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const userId = decoded.uid;

    // Create signed state payload
    const secret = await accessSecret('STRAVA_STATE_SECRET');
    if (!secret) {
      console.error('[Strava] STRAVA_STATE_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const now = Math.floor(Date.now() / 1000);
    const statePayload = {
      uid: userId,
      redirect: typeof redirectPath === 'string' && redirectPath.startsWith('/') ? redirectPath : '/',
      iat: now,
      exp: now + 600, // 10 minute expiry
    };

    const payloadJson = JSON.stringify(statePayload);
    const payloadB64 = Buffer.from(payloadJson).toString('base64url');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadB64);
    const signature = hmac.digest('base64url');
    const state = `${payloadB64}.${signature}`;

    // Get Strava credentials
    const clientId = await accessSecret('NEXT_PUBLIC_STRAVA_CLIENT_ID');
    if (!clientId) {
      console.error('[Strava] NEXT_PUBLIC_STRAVA_CLIENT_ID not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Build redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    const redirectUri = new URL('/api/strava/token-exchange', baseUrl).toString();

    // Build Strava authorization URL
    // Docs: https://developers.strava.com/docs/authentication/#requesting-access
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'activity:read_all,activity:write', // Comma-delimited or space-delimited
      approval_prompt: 'auto',
      state: state,
    });

    const stravaUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;

    console.log('[Strava Start] FULL DEBUG', { 
      userId, 
      redirectUri,
      baseUrl,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      requestOrigin: new URL(request.url).origin,
      stravaUrlFull: stravaUrl.substring(0, 200),
    });

    return NextResponse.json({ url: stravaUrl, debug: { redirectUri, baseUrl } });
  } catch (err: any) {
    console.error('[Strava Start] Error', err?.message);
    return NextResponse.json({ error: 'Failed to initialize Strava connection' }, { status: 500 });
  }
}
