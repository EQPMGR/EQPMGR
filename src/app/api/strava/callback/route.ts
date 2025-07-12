
import { type NextRequest, NextResponse } from 'next/server';

// This route is no longer used in the new flow. The logic has been
// moved to the /api/strava/token-exchange route to provide a clearer
// step-by-step process on the /strava page.

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "This route is deprecated. Please use the new flow starting at /strava." });
}
