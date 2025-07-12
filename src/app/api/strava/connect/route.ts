// This route is no longer used. The logic is now handled by the /strava page
// linking directly to Strava's authorization endpoint.
// This file can be safely deleted.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'This route is deprecated.',
  });
}
