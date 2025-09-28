
'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function exchangeStravaToken(code: string): Promise<{ success: boolean; error?: string }> {
  const session = cookies().get('__session')?.value;
  if (!session) {
    return { success: false, error: 'User is not authenticated.' };
  }

  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('CRITICAL ERROR: Missing Strava credentials on server.');
    return { success: false, error: 'Server configuration error for Strava connection.' };
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

    return { success: true };

  } catch (error: any) {
    console.error('FATAL ERROR during server-side token exchange.', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return { success: false, error: error.message || 'An unexpected server error occurred.' };
  }
}
