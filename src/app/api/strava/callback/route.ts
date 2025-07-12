
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { admin, db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const sessionCookie = cookies().get('__session')?.value;
  
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_STRAVA_CLIENT_SECRET;
  
  // The redirect URI must be IDENTICAL to the one used in the initial /connect request.
  const redirectUri = 'http://127.0.0.1:3000/api/strava/callback';

  if (error) {
    console.error('Strava OAuth Error:', error);
    return NextResponse.redirect(new URL('/settings/apps?error=strava_access_denied', request.url));
  }

  if (!code) {
     return NextResponse.redirect(new URL('/settings/apps?error=strava_missing_code', request.url));
  }
  
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!clientId || !clientSecret) {
    console.error('Strava environment variables are not set.');
    return NextResponse.redirect(new URL('/settings/apps?error=server_config_error', request.url));
  }

  try {
    const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);
    const uid = decodedToken.uid;
    
    // Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.errors) {
      console.error('Strava Token Exchange Error:', tokenData);
      throw new Error(tokenData.message || 'Failed to get token from Strava.');
    }

    const {
      access_token,
      refresh_token,
      expires_at,
      athlete,
    } = tokenData;

    // Save the tokens and athlete info to the user's document in Firestore
    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.set({
      strava: {
        id: athlete.id,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expires_at,
        scope: searchParams.get('scope'),
        connectedAt: new Date().toISOString(),
      }
    }, { merge: true });
    
    // Redirect to the settings page with a success message
    return NextResponse.redirect(new URL('/settings/apps?success=strava_connected', request.url));

  } catch (err: any) {
    console.error('Callback handler error:', err);
    return NextResponse.redirect(new URL(`/settings/apps?error=${err.message || 'strava_callback_failed'}`, request.url));
  }
}
