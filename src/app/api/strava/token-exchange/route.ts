// This file is no longer used and can be deleted.
// The logic is now handled by a server action in /src/app/(app)/settings/apps/actions.ts
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'This API endpoint is deprecated.' },
    { status: 410 }
  );
}
