
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  
  if (!clientId) {
    return NextResponse.json(
      { error: 'Strava Client ID is not configured.' },
      { status: 500 }
    );
  }

  // Redirect URI points back to the settings page where the code will be handled.
  // Using 127.0.0.1 is often more reliable for local development than localhost.
  const redirectUri = 'http://127.0.0.1:3000/settings/apps';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'force', // Always ask for approval, helps avoid loops
    scope: 'read_all,profile:read_all,activity:read_all',
  });

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;

  // Redirect the user to Strava's authorization page
  return NextResponse.redirect(stravaAuthUrl);
}
