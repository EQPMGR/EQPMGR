
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

// This endpoint is called by the client to create a session cookie after a successful login.
export async function POST(request: NextRequest) {
  try {
    const idToken = await request.text();

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    // Set session expiration to 5 days.
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    try {
      const adminAuth = await getAdminAuth();
      const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
      cookies().set('__session', sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true, path: '/' });

      return NextResponse.json({ status: 'success' });
    } catch (error: any) {
      console.error('Error creating session cookie:', error);

      // Provide a more specific error message back to the client
      let errorMessage = 'Failed to create session.';
      if (error.code === 'auth/invalid-id-token') {
        errorMessage = 'The provided ID token is invalid or has expired. Please sign out and back in.';
      } else if (error.code === 'auth/argument-error') {
        errorMessage = 'The ID token is malformed or has been revoked.';
      }

      return NextResponse.json({
        error: errorMessage,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      }, { status: error.code === 'auth/invalid-id-token' || error.code === 'auth/argument-error' ? 401 : 500 });
    }
  } catch (outerError: any) {
    console.error('Error in POST function:', outerError);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

// This endpoint is called to clear the session cookie on logout.
export async function DELETE(request: NextRequest) {
    cookies().delete('__session');
    return NextResponse.json({ status: 'success' });
}
