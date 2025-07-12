
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { admin } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const sessionCookie = cookies().get('__session')?.value;
  const redirectUri = 'http://localhost:3000/api/strava/callback';

  if (error) {
    console.error('Strava OAuth Error:', error);
    // Redirect to a settings page with an error message
    return NextResponse.redirect(new URL('/settings/apps?error=strava_access_denied', request.url));
  }

  if (!code) {
     return NextResponse.redirect(new URL('/settings/apps?error=strava_missing_code', request.url));
  }
  
  if (!sessionCookie) {
    // This should not happen if middleware is set up correctly
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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
        client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.errors) {
      console.error('Strava Token Exchange Error:', tokenData.errors);
      throw new Error('Failed to get token from Strava.');
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
    return NextResponse.redirect(new URL('/settings/apps?error=strava_callback_failed', request.url));
  }
}
