
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    const clientId = process.env.NEXT_PUBLIC_MAPMYRIDE_CLIENT_ID;
    const clientSecret = process.env.MAPMYRIDE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('MapMyRide environment variables are not set correctly on the server.');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is missing' }, { status: 400 });
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    });

    const response = await fetch('https://api.mapmyfitness.com/v7.1/oauth2/access_token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Api-Key': clientId,
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MapMyRide Token Exchange Error:', data);
      const errorMessage = data.message || 'Failed to get token from MapMyRide.';
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    // Also need to fetch the user's profile ID from MapMyRide
    const userProfileResponse = await fetch('https://api.mapmyfitness.com/v7.1/user/self', {
        headers: {
            'Authorization': `Bearer ${data.access_token}`,
            'Api-Key': clientId,
        }
    });

    if (!userProfileResponse.ok) {
        console.error('MapMyRide User Profile Error:', await userProfileResponse.text());
        return NextResponse.json({ error: 'Failed to fetch user profile from MapMyRide.' }, { status: 500 });
    }
    
    const userProfile = await userProfileResponse.json();

    const responseData = {
        ...data,
        user_id: userProfile.id,
    }

    return NextResponse.json(responseData);

  } catch (err: any) {
    console.error('Token exchange handler error:', err);
    return NextResponse.json({ error: err.message || 'An unexpected internal error occurred' }, { status: 500 });
  }
}
