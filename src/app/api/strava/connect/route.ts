
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const appUrl = 'http://localhost:3000'; // Hardcode for local development

  if (!clientId) {
    console.error('Strava Client ID is not configured in environment variables.');
    return NextResponse.json(
      { error: 'Application is not configured correctly. Please contact support.' },
      { status: 500 }
    );
  }

  // The redirect URI must be absolute and match what's expected for the environment.
  const redirectUri = `${appUrl}/settings/apps`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'force',
    scope: 'read_all,profile:read_all,activity:read_all',
  });

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;

  // Redirect the user to Strava's authorization page
  return NextResponse.redirect(stravaAuthUrl);
}
