// This route is no longer used. The logic is now handled by the /strava page
// and the /api/strava/token-exchange route.
// This file can be safely deleted.
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'This route is deprecated.',
  });
}
