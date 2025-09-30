
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { code, idToken } = await request.json();

    if (!code || !idToken) {
      return NextResponse.json({ error: 'Missing authorization code or ID token.' }, { status: 400 });
    }
    
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    
    // Securely verify the user's identity using the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);
    const userId = decodedToken.uid;

    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('CRITICAL ERROR: Missing Strava credentials on server.');
      return NextResponse.json({ error: 'Server configuration error for Strava connection.' }, { status: 500 });
    }

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

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('FATAL ERROR during server-side token exchange.', {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    return NextResponse.json({ success: false, error: err.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
