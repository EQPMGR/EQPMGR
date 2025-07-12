
import { type NextRequest, NextResponse } from 'next/server';

// This route is deprecated and no longer used in the primary authentication flow.
// The logic has been moved to the /strava page and the /api/strava/token-exchange route
// to provide a clearer, more robust, step-by-step process.
// It is kept here for reference to avoid breaking old links or configurations.

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "This route is deprecated. Please use the new flow starting at /strava." });
}
