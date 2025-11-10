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
    // We'll attempt to get a non-existent document to test the connection.
    await db.getDoc('_health_check', 'test');
    console.log('Successfully communicated with backend database.');

    return NextResponse.json({ status: 'ok', backend: 'initialized' });
  } catch (error) {
    console.error('HEALTH CHECK FAILED:', error);
    return NextResponse.json({ status: 'error', backend: 'failed' }, { status: 500 });
  }
}