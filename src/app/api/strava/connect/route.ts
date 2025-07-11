
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  
  // For development, we hardcode the redirect URI to ensure consistency.
  // In a production environment, this would come from an environment variable.
  const redirectUri = 'http://localhost:3000/api/strava/callback';
  
  if (!clientId) {
    console.error('Strava client ID is not set in environment variables.');
    // Provide a user-friendly error response
    return NextResponse.json(
      { error: 'Server configuration error. Strava integration is not set up correctly.' }, 
      { status: 500 }
    );
  }

  // Construct the full authorization URL.
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });

  const stravaAuthorizeUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;

  // Redirect the user to the Strava authorization page.
  return NextResponse.redirect(stravaAuthorizeUrl);
}
