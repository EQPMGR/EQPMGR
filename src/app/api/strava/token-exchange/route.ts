// app/api/strava/token-exchange/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) { // Changed from GET to POST
  console.log('API Route POST /api/strava/token-exchange has been hit.');

  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('CRITICAL ERROR: Missing Strava Client ID or Secret.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const { code } = await req.json(); // Read the code from the request body

    if (!code) {
      console.error('ERROR: No authorization code provided in the POST body.');
      return NextResponse.json({ error: 'Missing authorization code.' }, { status: 400 });
    }

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
    
    // TODO: Save the token to the user's profile
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('FATAL ERROR during token exchange.', error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}