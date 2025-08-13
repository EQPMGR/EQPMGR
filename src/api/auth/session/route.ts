
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

// This endpoint is called by the client to create a session cookie after a successful login.
export async function POST(request: NextRequest) {
  const idToken = await request.text();

  if (!idToken) {
    return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
  }

  // Set session expiration to 5 days.
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    cookies().set('__session', sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true, path: '/' });
    
    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    // Log the detailed error on the server for debugging
    console.error('Error creating session cookie:', error);

    // Send a more specific error message back to the client
    let errorMessage = 'Failed to create session.';
    if (error.code === 'auth/invalid-id-token') {
        errorMessage = 'The provided ID token is invalid or has expired. Please try signing out and back in.';
    } else if (error.code === 'auth/argument-error') {
        errorMessage = 'The ID token is malformed or has been revoked.';
    }
    
    return NextResponse.json({ error: errorMessage, details: error.message }, { status: 401 });
  }
}

// This endpoint is called to clear the session cookie on logout.
export async function DELETE(request: NextRequest) {
    cookies().delete('__session');
    return NextResponse.json({ status: 'success' });
}
