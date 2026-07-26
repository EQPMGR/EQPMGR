
import crypto from 'crypto';
import https from 'https';
import { type NextRequest, NextResponse } from 'next/server';
import { getServerAuth, getServerDb } from '@/backend';
import { cookies } from 'next/headers';
import { accessSecret } from '@/lib/secrets';

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

type ExchangeRequestBody = {
  code?: string;
  state?: string;
  idToken?: string;
};

type StravaStatePayload = {
  uid: string;
  redirect: string;
  iat: number;
  exp: number;
};

async function verifyStravaState(state: string | null): Promise<StravaStatePayload> {
  if (!state) {
    throw new Error('Missing OAuth state.');
  }

  const secret = await accessSecret('STRAVA_STATE_SECRET');
  if (!secret) {
    console.error('STRAVA_STATE_SECRET not configured');
    throw new Error('Server configuration error.');
  }

  const [payloadB64, signature] = state.split('.');
  if (!payloadB64 || !signature) {
    throw new Error('Invalid OAuth state format.');
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Invalid OAuth state signature.');
  }

  let payloadJson: string;
  try {
    payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch (err) {
    throw new Error('Invalid OAuth state payload.');
  }

  let payload: StravaStatePayload;
  try {
    payload = JSON.parse(payloadJson) as StravaStatePayload;
  } catch {
    throw new Error('Invalid OAuth state payload.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Expired OAuth state.');
  }
  if (payload.iat > now + 60) {
    throw new Error('Invalid OAuth state timestamp.');
  }

  if (!payload.uid || !payload.redirect || typeof payload.redirect !== 'string') {
    throw new Error('Invalid OAuth state payload.');
  }
  if (!payload.redirect.startsWith('/') || payload.redirect.startsWith('//')) {
    throw new Error('Invalid redirect path in OAuth state.');
  }

  return payload;
}

async function executeStravaTokenExchange({
  code,
  state,
  requestOrOrigin,
}: {
  code: string;
  state: string | null;
  requestOrOrigin: NextRequest | string;
}) {
  const statePayload = await verifyStravaState(state);
  const userId = statePayload.uid;

  console.log('[Strava Token Exchange] Parsed state and extracted userId', {
    userId,
    redirectPath: statePayload.redirect,
  });

  const [clientId, clientSecret] = await Promise.all([
    accessSecret('NEXT_PUBLIC_STRAVA_CLIENT_ID'),
    accessSecret('STRAVA_CLIENT_SECRET'),
  ]);

  if (!clientId || !clientSecret) {
    console.error('CRITICAL ERROR: Missing Strava credentials on server.');
    throw new Error('Server configuration error for Strava connection.');
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof requestOrOrigin === 'string' ? requestOrOrigin : requestOrOrigin.nextUrl.origin);
  const redirectUri = new URL('/api/strava/token-exchange', baseUrl).toString();

  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  };

  if (process.env.NODE_ENV !== 'production') {
    fetchOptions.agent = new https.Agent({ rejectUnauthorized: false });
  }

  let response: Response;
  try {
    response = await fetch('https://www.strava.com/oauth/token', fetchOptions);
  } catch (fetchError: any) {
    console.error('Strava token exchange fetch failed.', fetchError);
    throw new Error('Failed to contact Strava token endpoint. Check network/TLS configuration.');
  }

  const data = await response.json();

  if (!response.ok) {
    console.error('ERROR: Strava API rejected token exchange.', data);
    const errMsg = data?.message || 'Failed to exchange code with Strava.';
    const errDetail = data?.errors ? ` ${JSON.stringify(data.errors)}` : '';
    throw new Error(`${errMsg}${errDetail}`);
  }

  if (process.env.STRAVA_DEBUG === 'true') {
    console.log('[Strava Token Exchange] Strava API response (redacted)', {
      token_type: data.token_type,
      expires_at: data.expires_at,
      expires_in: data.expires_in,
      scope: data.scope,
      athlete_id: data.athlete?.id,
      access_token_first_8: data.access_token?.slice(0, 8),
      refresh_token_first_8: data.refresh_token?.slice(0, 8),
    });
  }

  if (typeof data.expires_at !== 'number' || data.expires_at <= 0) {
    throw new Error('Invalid expires_at from Strava: expected positive number.');
  }

  if (!data.athlete || typeof data.athlete !== 'object') {
    throw new Error('Invalid athlete object from Strava: athlete data missing.');
  }

  if (!data.athlete.id || typeof data.athlete.id !== 'number') {
    throw new Error('Invalid athlete ID from Strava: expected numeric ID.');
  }

  if (typeof data.access_token !== 'string' || !data.access_token) {
    throw new Error('Invalid access token from Strava: expected non-empty string.');
  }

  if (typeof data.refresh_token !== 'string' || !data.refresh_token) {
    throw new Error('Invalid refresh token from Strava: expected non-empty string.');
  }

  const stravaPayload = {
    strava: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      athleteId: data.athlete.id,
      scope: data.scope || '',
    },
  };

  const db = await getServerDb();
  const existingUser = await db.getDoc('app_users', userId);
  if (!existingUser.exists) {
    throw new Error('Authenticated user record not found.');
  }

  const insertPayload = {
    strava: stravaPayload.strava,
  };
  console.log('[Strava Token Exchange] updating app_users row for user', {
    userId,
    strava: stravaPayload.strava,
  });

  try {
    await db.updateDoc('app_users', userId, insertPayload);
  } catch (upsertError: any) {
    console.error('[Strava Token Exchange] app_users updateDoc failed', upsertError);
    throw new Error(`Failed to save Strava credentials: ${upsertError?.message || 'unknown error'}`);
  }

  const savedRow = await db.getDoc('app_users', userId);
  const savedStrava = savedRow.data?.strava;

  console.log('[Strava Token Exchange] VERIFICATION CHECK', {
    userExists: savedRow.exists,
    savedStravaExists: !!savedStrava,
    savedAthleteId: savedStrava?.athleteId,
    expectedAthleteId: stravaPayload.strava.athleteId,
    savedExpiresAt: savedStrava?.expiresAt,
    expectedExpiresAt: stravaPayload.strava.expiresAt,
    athleteIdMatch: savedStrava?.athleteId === stravaPayload.strava.athleteId,
    expiresAtMatch: savedStrava?.expiresAt === stravaPayload.strava.expiresAt,
    scope: savedStrava?.scope,
  });

  if (!savedRow.exists) {
    throw new Error('Failed to verify user record after saving Strava credentials. User row missing.');
  }

  if (
    !savedStrava ||
    savedStrava.athleteId !== stravaPayload.strava.athleteId ||
    savedStrava.expiresAt !== stravaPayload.strava.expiresAt
  ) {
    throw new Error('Strava credentials were not persisted after token exchange. Please reconnect your account.');
  }

  const redirectPath = statePayload.redirect;
  const finalRedirectUrl = new URL(redirectPath, baseUrl);
  finalRedirectUrl.searchParams.set('strava_connected', 'true');

  return finalRedirectUrl.toString();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  console.log('[Strava Token Exchange] GET entry', {
    url: request.url,
    codePresent: !!code,
    statePresent: !!state,
    errorPresent: !!error,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (error) {
    console.error('Strava OAuth Error:', error);
    return new Response(
      '<html><body><h1>Authentication Canceled</h1><p>You have canceled the Strava connection. You can close this window.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' }, status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code.' }, { status: 400 });
  }

  try {
    const redirectUrl = await executeStravaTokenExchange({ code, state, requestOrOrigin: request });
    console.log('[Strava Token Exchange] GET handler successfully generated redirect URL', { redirectUrl });
    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    const errorId = `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffff).toString(16)}`;
    console.error('[Strava Token Exchange] GET handler caught error', { errorId, errorMessage: err?.message, errorStack: err?.stack });

    if (process.env.STRAVA_DEBUG === 'true') {
      return NextResponse.json(
        {
          error: err?.message || 'Unexpected server error during Strava token exchange.',
          errorId,
          debug: err?.stack || null,
        },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: err?.message || 'Unexpected server error during Strava token exchange.', errorId }, { status: 500 });
    }
    return new Response(
      `<html><body><h1>Authentication Failed</h1><p>An unexpected server error occurred. Please try again later.</p><p>Error id: <strong>${errorId}</strong></p></body></html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExchangeRequestBody;
    const code = body.code;
    const state = body.state || null;
    let idToken = body.idToken;

    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('strava_id_token')?.value;
    console.log('[Strava Token Exchange] POST entry', {
      codePresent: !!code,
      statePresent: !!state,
      bodyTokenPresent: !!body.idToken,
      cookieTokenPresent: !!cookieToken,
      bodyTokenLength: body.idToken?.length ?? 0,
      cookieTokenLength: cookieToken?.length ?? 0,
    });

    if (!code || !idToken) {
      idToken = idToken || cookieToken;
      if (cookieToken && !idToken) {
        console.log('[Strava Token Exchange] Using cookie token fallback');
      }
    }

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code.' }, { status: 400 });
    }

    if (!idToken) {
      return NextResponse.json({ error: 'Authentication token not found. Please try connecting again.' }, { status: 400 });
    }

    try {
      const origin = new URL(request.url).origin;
      const redirectUrl = await executeStravaTokenExchange({ code, state, idToken, requestOrOrigin: origin });
      cookieStore.delete('strava_id_token');
      const responsePayload: { redirectUrl: string; debug?: any; debugFlag: string | null; codeMarker: string } = {
        redirectUrl,
        debugFlag: process.env.STRAVA_DEBUG ?? null,
        codeMarker: 'strava_token_exchange_v2',
      };
      if (process.env.STRAVA_DEBUG === 'true') {
        const savedRow = await getServerDb().getDoc('app_users', (await getServerAuth().verifyIdToken(idToken, true)).uid);
        responsePayload.debug = {
          userId: savedRow.id,
          savedStrava: savedRow.data?.strava,
          rowExists: savedRow.exists,
        };
      }
      return NextResponse.json(responsePayload);
    } catch (err: any) {
      console.error('FATAL ERROR during server-side token exchange.', err);
      const errorMessage = err?.message || 'Strava token exchange failed. Please try again.';
      const responsePayload: { error: string; debug?: string } = { error: errorMessage };
      if (process.env.STRAVA_DEBUG === 'true') {
        responsePayload.debug = errorMessage;
      }
      return NextResponse.json(responsePayload, { status: 500 });
    }
  } catch (err: any) {
    console.error('Invalid Strava token exchange request.', err);
    const errorMessage = err?.message || 'Invalid request payload.';
    const responsePayload: { error: string; debug?: string } = { error: errorMessage };
    if (process.env.STRAVA_DEBUG === 'true') {
      responsePayload.debug = errorMessage;
    }
    return NextResponse.json(responsePayload, { status: 400 });
  }
}
