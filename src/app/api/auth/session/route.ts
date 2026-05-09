
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuth } from '@/backend';

const SESSION_COOKIE = '__session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

async function setSessionCookie(token: string) {
  cookies().set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json();
    if (!access_token) {
      return NextResponse.json({ error: 'access_token is required' }, { status: 400 });
    }

    const auth = await getServerAuth();
    await auth.verifyIdToken(access_token);

    await setSessionCookie(access_token);
    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', error: error?.message || 'auth_failed' },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  cookies().delete(SESSION_COOKIE, { path: '/' });
  return NextResponse.json({ status: 'success' });
}
