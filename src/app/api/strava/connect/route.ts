// This file is no longer used and can be deleted.
// The connection logic is now initiated client-side from `/settings/apps`.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { message: 'This route is deprecated.' },
    { status: 404 }
  );
}
