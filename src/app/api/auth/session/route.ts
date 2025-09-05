
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

// This endpoint is called by the client to create a session cookie after a successful login.
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    // Set session expiration to 5 days.
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    try {
      const adminAuth = await getAdminAuth();
      // First, verify the ID token to ensure it's valid.
      await adminAuth.verifyIdToken(idToken);

      // If verification is successful, create the session cookie.
      const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
      cookies().set('__session', sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true, path: '/' });

      return NextResponse.json({ status: 'success' });
    } catch (error: any) {
      console.error('Error creating session cookie:', error);
      let errorMessage = 'An unexpected error occurred.';
      let statusCode = 500;
      
      switch (error.code) {
        case 'auth/invalid-id-token':
        case 'auth/id-token-revoked':
        case 'auth/id-token-expired':
            errorMessage = 'The ID token is malformed or has been revoked.';
            statusCode = 401;
            break;
        case 'auth/argument-error':
            errorMessage = 'The ID token is malformed.';
            statusCode = 401;
            break;
      }

      return NextResponse.json({
        error: errorMessage,
        details: error.message, // For more detailed client-side logging if needed
      }, { status: statusCode });
    }
  } catch (outerError: any) {
    console.error('Error in POST function:', outerError);
    // Return a generic error response from the outer catch
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// This endpoint is called to clear the session cookie on logout.
export async function DELETE(request: NextRequest) {
    cookies().delete('__session');
    return NextResponse.json({ status: 'success' });
}
