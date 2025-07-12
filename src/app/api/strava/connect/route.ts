import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  
  // Hardcoding the exact redirect URI to ensure consistency.
  const redirectUri = 'http://127.0.0.1:3000/api/strava/callback';

  if (!clientId) {
    console.error('Strava client ID is not set in environment variables.');
    return NextResponse.json(
      { error: 'Server configuration error. Strava integration is not set up correctly.' }, 
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });

  const stravaAuthorizeUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  
  return NextResponse.redirect(stravaAuthorizeUrl);
}