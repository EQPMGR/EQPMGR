
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  
  // This is the full URL that the user will be sent back to after they authorize the app.
  // It must match a URL that is allowed by the "Authorization Callback Domain" in your Strava app settings.
  // For local development, Strava allows "localhost", which will match this full URL.
  const redirectUri = 'http://localhost:3000/api/strava/callback';

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
    scope: 'read,activity:read_all', // Requesting read access for public activities and all activities
  });

  const stravaAuthorizeUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  
  // Redirect the user to the Strava authorization page.
  return NextResponse.redirect(stravaAuthorizeUrl);
}
