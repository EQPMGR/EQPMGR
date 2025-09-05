
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
      // Verify the ID token first. This is a crucial step.
      await adminAuth.verifyIdToken(idToken);

      const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
      cookies().set('__session', sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true, path: '/' });

      return NextResponse.json({ status: 'success' });
    } catch (error: any) {
      // Log the detailed error on the server for debugging
      console.error('Error creating session cookie:', error);

      // Send a more specific error message back to the client based on the error code
      let errorMessage = 'Failed to create session.';
      if (error.code === 'auth/invalid-id-token' || error.code === 'auth/id-token-revoked' || error.code === 'auth/id-token-expired') {
        errorMessage = 'The ID token is malformed or has been revoked.';
      } else if (error.code === 'auth/argument-error') {
          errorMessage = 'The ID token is malformed or has been revoked.';
      }
      
      // Always return a 401 for auth-related errors.
      return NextResponse.json({
        error: errorMessage,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      }, { status: 401 });
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
