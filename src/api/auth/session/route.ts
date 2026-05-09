
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// This endpoint is currently disabled - auth is mocked in development
// TODO: Re-enable for production with proper Supabase setup

export async function POST(request: NextRequest) {
  // Development mode: mock auth, no session cookie needed
  return NextResponse.json({ status: 'success', message: 'Dev mode - auth mocked' });
}

// This endpoint is called to clear the session cookie on logout.
export async function DELETE(request: NextRequest) {
  cookies().delete('__session');
  return NextResponse.json({ status: 'success' });
}
