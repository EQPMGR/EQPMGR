
import crypto from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getServerAuth, getServerDb } from '@/backend';
import { cookies } from 'next/headers';
import { accessSecret } from '@/lib/secrets';

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Strava OAuth State Payload (JWS format: payload.signature)
 */
type StravaStatePayload = {
  uid: string;
  redirect: string;
  iat: number;
  exp: number;
};

/**
 * Parse and verify the signed state from Strava callback
 * 
 * Follows: https://developers.strava.com/docs/authentication/#token-exchange
 */
async function verifyState(stateParam: string | null): Promise<StravaStatePayload> {
  if (!stateParam) {
    throw new Error('Missing OAuth state parameter');
  }

  const [payloadB64, signatureB64] = stateParam.split('.');
  if (!payloadB64 || !signatureB64) {
    throw new Error('Invalid state format');
  }

  // Get the signing secret
  const secret = await accessSecret('STRAVA_STATE_SECRET');
  if (!secret) {
    throw new Error('Server misconfigured: STRAVA_STATE_SECRET not available');
  }

  // Verify signature using timing-safe comparison
  const expectedSignature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expectedSignature))) {
    throw new Error('Invalid state signature');
  }

  // Decode and parse the payload
  let payload: StravaStatePayload;
  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    payload = JSON.parse(payloadJson) as StravaStatePayload;
  } catch {
    throw new Error('Invalid state payload');
  }

  // Validate payload structure and expiry
  const now = Math.floor(Date.now() / 1000);
  if (!payload.uid || !payload.redirect || !payload.iat || !payload.exp) {
    throw new Error('Invalid state payload: missing required fields');
  }
  if (payload.exp < now) {
    throw new Error('State expired');
  }
  if (payload.iat > now + 60) {
    throw new Error('Invalid state: iat in future');
  }
  if (!payload.redirect.startsWith('/') || payload.redirect.startsWith('//')) {
    throw new Error('Invalid redirect path in state');
  }

  return payload;
}

/**
 * Exchange authorization code for tokens
 * 
 * Follows: https://developers.strava.com/docs/authentication/#token-exchange
 * 
 * Request: POST https://www.strava.com/oauth/token
 *   - client_id (required)
 *   - client_secret (required)
 *   - code (required)
 *   - grant_type: "authorization_code" (required)
 * 
 * Response:
 *   - access_token
 *   - refresh_token
 *   - expires_at (seconds since epoch)
 *   - athlete { id, ... }
 *   - scope
 */
async function exchangeCodeForToken(code: string, redirectUri: string) {
  const clientId = await accessSecret('NEXT_PUBLIC_STRAVA_CLIENT_ID');
  const clientSecret = await accessSecret('STRAVA_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Server misconfigured: Strava credentials missing');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  };

  // Allow self-signed certs in dev
  if (process.env.NODE_ENV !== 'production') {
    const https = require('https');
    fetchOptions.agent = new https.Agent({ rejectUnauthorized: false });
  }

  let response: Response;
  try {
    response = await fetch('https://www.strava.com/oauth/token', fetchOptions);
  } catch (err: any) {
    console.error('[Strava] Token exchange fetch failed', err.message);
    throw new Error('Failed to contact Strava token endpoint');
  }

  const data = await response.json();

  if (!response.ok) {
    console.error('[Strava] Token exchange failed', data);
    throw new Error(data?.message || 'Strava rejected token exchange');
  }

  // Validate response structure per Strava spec
  if (!data.athlete || typeof data.athlete.id !== 'number') {
    throw new Error('Invalid Strava response: missing athlete ID');
  }

  if (typeof data.access_token !== 'string' || !data.access_token) {
    throw new Error('Invalid Strava response: missing access token');
  }

  if (typeof data.refresh_token !== 'string' || !data.refresh_token) {
    throw new Error('Invalid Strava response: missing refresh token');
  }

  if (typeof data.expires_at !== 'number' || data.expires_at <= 0) {
    throw new Error('Invalid Strava response: invalid expires_at');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athleteId: data.athlete.id,
    scope: data.scope || '',
  };
}

/**
 * Save Strava credentials to database
 */
async function saveStravaCredentials(userId: string, stravaData: Awaited<ReturnType<typeof exchangeCodeForToken>>) {
  const db = await getServerDb();

  // Verify user exists
  const existingUser = await db.getDoc('app_users', userId);
  if (!existingUser.exists) {
    throw new Error('User record not found');
  }

  // Save credentials
  try {
    await db.updateDoc('app_users', userId, { strava: stravaData });
  } catch (err: any) {
    console.error('[Strava] Failed to save credentials', err.message);
    throw new Error('Failed to save Strava credentials');
  }

  // Verify the write succeeded
  const savedUser = await db.getDoc('app_users', userId);
  const savedStrava = savedUser.data?.strava;

  if (!savedStrava || savedStrava.athleteId !== stravaData.athleteId) {
    throw new Error('Failed to verify Strava credentials were saved');
  }

  console.log('[Strava] Successfully saved credentials for user', { userId, athleteId: stravaData.athleteId });
}

/**
 * GET /api/strava/token-exchange
 * 
 * Strava redirects the user here after authorization
 * Query params: code, state, scope
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('[Strava Callback] GET', { codePresent: !!code, statePresent: !!state, errorPresent: !!error });

  // User denied authorization
  if (error) {
    console.log('[Strava Callback] User denied authorization', { error });
    return new Response(
      '<html><body><h1>Authorization Denied</h1><p>You denied access to your Strava account. You can close this window.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' }, status: 200 }
    );
  }

  if (!code) {
    return new Response(
      '<html><body><h1>Error</h1><p>Missing authorization code from Strava. Please try again.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' }, status: 400 }
    );
  }

  try {
    // Verify and decode state
    const statePayload = await verifyState(state);
    const userId = statePayload.uid;

    // Build redirect URI (must match what was sent to Strava)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const redirectUri = new URL('/api/strava/token-exchange', baseUrl).toString();

    // Exchange code for tokens
    const stravaData = await exchangeCodeForToken(code, redirectUri);

    // Save to database
    await saveStravaCredentials(userId, stravaData);

    // Build redirect URL back to the app
    const redirectUrl = new URL(statePayload.redirect, baseUrl);
    redirectUrl.searchParams.set('strava_connected', 'true');

    console.log('[Strava Callback] Success, redirecting to', redirectUrl.toString());
    return NextResponse.redirect(redirectUrl.toString());
  } catch (err: any) {
    console.error('[Strava Callback] Error', err.message);
    return new Response(
      `<html><body><h1>Authentication Failed</h1><p>${err.message}</p><p>Please try again or contact support.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    );
  }
}

/**
 * POST /api/strava/token-exchange
 * 
 * Fallback handler for client-side requests.
 * If the client somehow has a code, they can POST it here.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, state } = body;

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    // Verify and decode state
    const statePayload = await verifyState(state);
    const userId = statePayload.uid;

    // Build redirect URI (must match what was sent to Strava)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    const redirectUri = new URL('/api/strava/token-exchange', baseUrl).toString();

    // Exchange code for tokens
    const stravaData = await exchangeCodeForToken(code, redirectUri);

    // Save to database
    await saveStravaCredentials(userId, stravaData);

    // Return success with redirect URL
    const redirectUrl = new URL(statePayload.redirect, baseUrl);
    redirectUrl.searchParams.set('strava_connected', 'true');

    console.log('[Strava Token Exchange] POST Success', { userId, athleteId: stravaData.athleteId });
    return NextResponse.json({ redirectUrl: redirectUrl.toString() });
  } catch (err: any) {
    console.error('[Strava Token Exchange] POST Error', err.message);
    return NextResponse.json({ error: err.message || 'Token exchange failed' }, { status: 500 });
  }
}


