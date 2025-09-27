// src/app/api/strava/token-exchange/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin'; // Use the direct import

export async function POST(req: NextRequest) {
  console.log('API Route POST /api/strava/token-exchange has been hit.');

  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('CRITICAL ERROR: Missing Strava credentials on server.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const { code, idToken } = await req.json();

    if (!code || !idToken) {
      return NextResponse.json({ error: 'Missing code or idToken.' }, { status: 400 });
    }

    // Use the directly imported adminAuth service to securely verify the user
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    
    console.log(`Verified user: ${userId}. Exchanging Strava code...`);

    const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
      }),
    });
    
    const data = await response.json();

    if (!response.ok) {
      console.error('ERROR: Strava API rejected token exchange.', data);
      return NextResponse.json({ error: 'Strava API error', details: data }, { status: response.status });
    }

    const userProfileRef = doc(db, 'profiles', userId);
    await updateDoc(userProfileRef, {
      strava: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        athleteId: data.athlete.id,
      },
    });
    
    console.log('Successfully saved tokens to Firestore.');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('FATAL ERROR during token exchange.', error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}