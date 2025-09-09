
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
      // createSessionCookie() verifies the ID token and then creates the session cookie.
      // This is the correct, one-step process for creating a session.
      const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
      
      cookies().set('__session', sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true, path: '/' });

      return NextResponse.json({ status: 'success' });

    } catch (error: any) {
      // Log the full error object for better debugging on the server
      console.error('Error creating session cookie:', JSON.stringify(error, null, 2));

      // Provide a more specific error message based on the Firebase error code.
      let errorMessage = 'An unexpected error occurred while creating the session.';
      let statusCode = 500;
      
      switch (error.code) {
        case 'auth/invalid-id-token':
          errorMessage = 'The ID token provided is invalid.';
          statusCode = 401;
          break;
        case 'auth/id-token-revoked':
          errorMessage = 'The ID token has been revoked.';
          statusCode = 401;
          break;
        case 'auth/id-token-expired':
            errorMessage = 'The ID token has expired.';
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
