
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { doc, setDoc } from 'firebase/firestore';
import { cookies } from 'next/headers';

async function getUserIdFromSession(): Promise<string | null> {
    const session = cookies().get('__session')?.value || '';
    if (!session) {
        return null;
    }
    try {
        const adminAuth = await getAdminAuth();
        const decodedIdToken = await adminAuth.verifySessionCookie(session, true);
        return decodedIdToken.uid;
    } catch (error) {
        console.error("Error verifying session cookie in token exchange:", error);
        return null;
    }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const userId = await getUserIdFromSession();
    
    if (!userId) {
        return NextResponse.json({ error: 'User is not authenticated.' }, { status: 401 });
    }

    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Strava environment variables are not set correctly on the server.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is missing' }, { status: 400 });
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Strava Token Exchange Error:', data);
      const errorMessage = data.message || 'Failed to get token from Strava.';
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    // Securely save the tokens to the user's document in Firestore
    const adminDb = await getAdminDb();
    const userDocRef = doc(adminDb, 'users', userId);
    await setDoc(userDocRef, {
        strava: {
            id: data.athlete.id,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_at,
            scope: data.scope || '',
            connectedAt: new Date().toISOString(),
        }
    }, { merge: true });

    return NextResponse.json({ success: true, message: 'Strava connected successfully.' });

  } catch (err: any) {
    console.error('Token exchange handler error:', err);
    return NextResponse.json({ error: err.message || 'An unexpected internal error occurred' }, { status: 500 });
  }
}
