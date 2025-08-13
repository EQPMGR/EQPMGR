
import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

// This endpoint is called by the client to create a session cookie after a successful login.
export async function POST(request: NextRequest) {
  const authorization = headers().get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Bearer token is required' }, { status: 401 });
  }

  const idToken = authorization.split('Bearer ')[1];
  if (!idToken) {
    return NextResponse.json({ error: 'ID token is missing from Bearer token' }, { status: 401 });
  }

  // Set session expiration to 5 days.
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    cookies().set('__session', sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true, path: '/' });
    
    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('Error creating session cookie:', error);
    // Provide a more specific error message to the client
    const errorMessage = error.code === 'auth/invalid-id-token' 
        ? 'The provided ID token is invalid.' 
        : 'Failed to create session.';
    return NextResponse.json({ error: errorMessage }, { status: 401 });
  }
}

// This endpoint is called to clear the session cookie on logout.
export async function DELETE(request: NextRequest) {
    cookies().delete('__session');
    return NextResponse.json({ status: 'success' });
}
