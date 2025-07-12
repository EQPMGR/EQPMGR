
import { NextResponse } from 'next/server';

// This route is no longer used by the new authentication flow,
// but we will keep it for reference. The new flow is initiated
// from the client-side on the /strava page.
export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const redirectUri = 'http://127.0.0.1:3000/strava';

  if (!clientId) {
    return NextResponse.json(
      { error: 'Server configuration error.' }, 
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read_all,profile:read_all,activity:read_all',
  });

  const stravaAuthorizeUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  
  return NextResponse.redirect(stravaAuthorizeUrl);
}
