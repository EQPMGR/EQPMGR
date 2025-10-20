
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // If the user denied the connection on Strava's page
  if (error) {
    console.error('Strava OAuth Error:', error);
    const redirectUrl = new URL('/settings/apps', request.nextUrl.origin);
    redirectUrl.searchParams.set('strava_error', 'access_denied');
    return NextResponse.redirect(redirectUrl);
  }

  // Check for required parameters from Strava
  if (!code || !state) {
    return NextResponse.json({ error: 'Missing authorization code or state.' }, { status: 400 });
  }

  // The ID token is now passed via a temporary cookie set by the client
  const cookieStore = cookies();
  const idToken = cookieStore.get('strava_id_token')?.value;

  if (!idToken) {
      return NextResponse.json({ error: 'Authentication token not found. Please try connecting again.' }, { status: 400 });
  }

  // Clear the temporary cookie
  cookieStore.delete('strava_id_token');

  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    
    // Securely verify the user's identity using the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);
    const userId = decodedToken.uid;

    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

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

    const userDocRef = adminDb.collection('users').doc(userId);
    await userDocRef.set({
      strava: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        athleteId: data.athlete.id,
      },
    }, { merge: true });
    
    // Redirect the user back to the settings page with a success indicator
    // using a relative path to ensure it works in any environment.
    const redirectPath = `/settings/apps?strava_connected=true`;
    return NextResponse.redirect(new URL(redirectPath, request.nextUrl.origin));

  } catch (err: any) {
    console.error('FATAL ERROR during server-side token exchange.', {
      message: err.message,
      code: err.code,
    });
    // Redirect back with an error message
    const errorRedirectPath = `/settings/apps?strava_error=${encodeURIComponent(err.message || 'An unexpected server error occurred.')}`;
    return NextResponse.redirect(new URL(errorRedirectPath, request.nextUrl.origin));
  }
}
