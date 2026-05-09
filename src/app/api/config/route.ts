/**
 * Backend Configuration API Route
 *
 * Returns backend configuration to the client.
 * Uses the config loader system - no if/else switching here!
 *
 * The config loader automatically delegates to the correct backend
 * based on NEXT_PUBLIC_BACKEND_PROVIDER environment variable.
 */

import { NextResponse } from 'next/server';
import { getBackendConfig } from '@/backend/config/loader';

export async function GET() {
  try {
    const config = getBackendConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to load backend configuration:', error);

    return NextResponse.json(
      {
        error: 'Server configuration error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
