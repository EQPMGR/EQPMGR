// src/app/api/strava/token-exchange/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
// --- START: MODIFIED LINES ---
import { adminAuth } from '@/lib/firebase-admin'; // Import adminAuth directly
// --- END: MODIFIED LINES ---

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
      const missing = !code ? 'authorization code' : 'ID token';
      console.error(`ERROR: Missing ${missing} in the POST body.`);
      return NextResponse.json({ error: `Missing ${missing}.` }, { status: 400 });
    }

    // --- START: MODIFIED LINES ---
    // Verify the user's ID token using the imported adminAuth instance
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    // --- END: MODIFIED LINES ---
    
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
      return NextResponse.json({