// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { getServerDb } from '@/backend';

export async function GET() {
  console.log('Health check endpoint hit.');
  try {
    // Test that the backend database can be initialized successfully.
    const db = await getServerDb();
    console.log('Backend database initialized correctly.');

    // As a final check, try a simple operation to verify connectivity.
    // We attempt to get a document from a system collection that may or may not exist.
    // If we get past the network call, the database connection is working.
    try {
      await db.getDoc('_health_check', 'test');
    } catch (docError: any) {
      // We expect this to fail (table doesn't exist), but as long as it's not a network error, we're good
      if (docError.message?.includes('fetch') || docError.code === 'ECONNREFUSED') {
        throw docError;
      }
      // Other errors (permission, not found, etc.) mean the connection works
      console.log('Database connectivity verified (expected query error for non-existent table)');
    }

    console.log('Successfully communicated with backend database.');
    return NextResponse.json({ status: 'ok', backend: 'initialized' });
  } catch (error) {
    console.error('HEALTH CHECK FAILED:', error);
    return NextResponse.json({ status: 'error', backend: 'failed' }, { status: 500 });
  }
}