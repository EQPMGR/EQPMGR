
// This file is no longer used and can be deleted.
// The new callback is a standard page at `/strava/callback/page.tsx`.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { message: 'This route is deprecated.' },
    { status: 410 }
  );
}
