
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  
  // For development, it's safer to hardcode this to avoid environment issues.
  // When you publish, this will need to be updated to your production URL.
  const redirectUri = 'http://localhost:3000/api/strava/callback';
  
  if (!clientId) {
    console.error('Strava environment variables are not set.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const scope = 'read,activity:read_all';
  const approvalPrompt = 'auto';
  const responseType = 'code';

  const stravaAuthorizeUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&approval_prompt=${approvalPrompt}&scope=${scope}`;

  return NextResponse.redirect(stravaAuthorizeUrl);
}
