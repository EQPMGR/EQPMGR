
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';

// This endpoint is called by the client to create a session cookie after a successful login.
export async function POST(request: NextRequest) {
  const idToken = await request.text();

  if (!idToken) {
    return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
  }

  // Set session expiration to 5 days.
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  try {
    const auth = getAuth(adminApp());
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    cookies().set('__session', sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true, path: '/' });
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error creating session cookie:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 401 });
  }
}

// This endpoint is called to clear the session cookie on logout.
export async function DELETE(request: NextRequest) {
    cookies().delete('__session');
    return NextResponse.json({ status: 'success' });
}
