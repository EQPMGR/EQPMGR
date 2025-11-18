
import { type NextRequest, NextResponse } from 'next/server';
import { getServerAuth, getServerDb } from '@/backend';
import { cookies } from 'next/headers';
import { accessSecret } from '@/lib/secrets';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state'); // The original path

  // If the user denied the connection on Strava's page
  if (error) {
    console.error('Strava OAuth Error:', error);
    // Return a JSON response that the client can use to show an error.
    return new Response(
      '<html><body><h1>Authentication Canceled</h1><p>You have canceled the Strava connection. You can close this window.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' }, status: 400 }
    );
  }

  // Check for required parameters from Strava
  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const idToken = cookieStore.get('strava_id_token')?.value;

  if (!idToken) {
      return NextResponse.json({ error: 'Authentication token not found. Please try connecting again.' }, { status: 400 });
  }

  cookieStore.delete('strava_id_token');

  try {
    const auth = await getServerAuth();
    const db = await getServerDb();
    const decodedToken = await auth.verifyIdToken(idToken, true);
    const userId = decodedToken.uid;

    const [clientId, clientSecret] = await Promise.all([
      accessSecret('NEXT_PUBLIC_STRAVA_CLIENT_ID'),
      accessSecret('STRAVA_CLIENT_SECRET'),
    ]);

    if (!clientId || !clientSecret) {
      console.error('CRITICAL ERROR: Missing Strava credentials on server.');
      throw new Error('Server configuration error for Strava connection.');
    }

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('ERROR: Strava API rejected token exchange.', data);
      throw new Error(data.message || 'Failed to exchange code with Strava.');
    }

    await db.setDoc('app_users', userId, {
      strava: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        athleteId: data.athlete.id,
      },
    }, { merge: true });
    
    // Redirect back to the originating page with a success indicator.
    const redirectPath = state ? decodeURIComponent(state) : '/';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const finalRedirectUrl = new URL(redirectPath, baseUrl);
    finalRedirectUrl.searchParams.set('strava_connected', 'true');
    
    return NextResponse.redirect(finalRedirectUrl.toString());

  } catch (err: any) {
    console.error('FATAL ERROR during server-side token exchange.', {
      message: err.message,
      code: err.code,
    });
    return new Response(
      `<html><body><h1>Authentication Failed</h1><p>${err.message || 'An unexpected server error occurred.'}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    );
  }
}
