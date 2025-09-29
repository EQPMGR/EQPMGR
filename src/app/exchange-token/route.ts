
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const settingsUrl = new URL('/settings/apps', request.url);

  if (error) {
    settingsUrl.searchParams.set('error', error);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code) {
    settingsUrl.searchParams.set('error', 'Strava authorization code was not found.');
    return NextResponse.redirect(settingsUrl);
  }
  
  const session = cookies().get('__session')?.value;
  if (!session) {
      settingsUrl.searchParams.set('error', 'User authentication session not found.');
      return NextResponse.redirect(settingsUrl);
  }

  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('CRITICAL ERROR: Missing Strava credentials on server.');
    settingsUrl.searchParams.set('error', 'Server configuration error for Strava connection.');
    return NextResponse.redirect(settingsUrl);
  }
  
  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    
    const decodedToken = await adminAuth.verifySessionCookie(session, true);
    const userId = decodedToken.uid;
    
    const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
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

    settingsUrl.searchParams.set('success', 'true');
    return NextResponse.redirect(settingsUrl);

  } catch (err: any) {
    console.error('FATAL ERROR during server-side token exchange.', {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    settingsUrl.searchParams.set('error', err.message || 'An unexpected server error occurred.');
    return NextResponse.redirect(settingsUrl);
  }
}
