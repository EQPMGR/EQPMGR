// src/app/api/strava/token-exchange/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAdminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  console.log('API Route POST /api/strava/token-exchange has been hit.');

  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('CRITICAL ERROR: Missing Strava credentials on server.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }
  
  console.log('Successfully loaded Strava credentials.');

  try {
    const { code, idToken } = await req.json();

    if (!code || !idToken) {
      console.error('ERROR: Missing authorization code or idToken in request body.');
      return NextResponse.json({ error: 'Missing code or idToken.' }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    
    console.log(`Verified user: ${userId}. Exchanging Strava code: ${code}`);

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

  } catch (error: any) {
    console.error('FATAL ERROR during token exchange.', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'An unexpected server error occurred.', details: error.message }, { status: 500 });
  }
}
