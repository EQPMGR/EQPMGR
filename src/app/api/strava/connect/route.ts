
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  
  // Hardcoding the redirect URI to the most stable local address.
  // This must match one of the URIs configured in your Strava app settings.
  // The domain must also be set to '127.0.0.1' or 'localhost' in Strava.
  const redirectUri = 'http://127.0.0.1:3000/strava';

  if (!clientId) {
    return NextResponse.json(
      { error: 'Server configuration error: Strava Client ID is missing.' }, 
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'force', // 'force' is more reliable than 'auto' for avoiding loops
    scope: 'read_all,profile:read_all,activity:read_all',
  });

  const stravaAuthorizeUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  
  return NextResponse.redirect(stravaAuthorizeUrl);
}
