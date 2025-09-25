// app/api/strava/token-exchange/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  console.log('API Route /api/strava/token-exchange has been hit.');

  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('CRITICAL ERROR: Missing Strava Client ID or Secret.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }
  console.log('Successfully loaded Strava credentials.');

  const code = req.nextUrl.searchParams.get('code');

  if (!code) {
    console.error('ERROR: No authorization code from Strava.');
    return NextResponse.json({ error: 'Missing authorization code.' }, { status: 400 });
  }
  console.log(`Received authorization code: ${code}`);

  try {
    const response = await fetch('https://www.strava.com/api/v3/oauth/token', {
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

    const data = await response.json();

    if (!response.ok) {
      console.error('ERROR: Strava API rejected token exchange.', data);
      return NextResponse.redirect(new URL('/settings?strava=error', req.nextUrl.origin));
    }

    console.log('Successfully received access token from Strava:', data);

    // TODO: Save the access_token (data.access_token) to Firestore.

    return NextResponse.redirect(new URL('/settings?strava=success', req.nextUrl.origin));

  } catch (error) {
    console.error('FATAL ERROR during fetch to Strava.', error);
    return NextResponse.redirect(new URL('/settings?strava=error', req.nextUrl.origin));
  }
}