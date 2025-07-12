// This file is unused and can be deleted. The new flow uses /api/strava/token-exchange
// and redirects to the /settings/apps page directly.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'This route is deprecated and no longer used.',
  });
}
