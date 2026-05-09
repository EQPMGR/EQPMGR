import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerAuth } from '@/backend';
import { accessSecret } from '@/lib/secrets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = body?.idToken;
    const redirectPath = body?.redirectPath || '/';

    if (!idToken) return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });

    const auth = await getServerAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const uid = decoded.uid;

    const secret = await accessSecret('STRAVA_STATE_SECRET');
    if (!secret) {
      console.error('STRAVA_STATE_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = { uid, redirect: redirectPath, iat: now, exp: now + 300 };
    const payloadStr = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadStr, 'utf8').toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
    const state = `${payloadB64}.${sig}`;

    const clientId = await accessSecret('NEXT_PUBLIC_STRAVA_CLIENT_ID');
    if (!clientId) {
      console.error('Missing Strava client id');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/strava/token-exchange`;

    const stravaUrl = `https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&approval_prompt=force&scope=read,activity:read_all&state=${encodeURIComponent(state)}`;

    return NextResponse.json({ url: stravaUrl });
  } catch (err: any) {
    console.error('Error building Strava start URL', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
