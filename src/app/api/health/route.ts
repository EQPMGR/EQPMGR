// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; // We'll try to import this

export async function GET() {
  console.log('Health check endpoint hit.');
  try {
    // The real test is whether the import above crashed the server.
    // If we get this far, the Admin SDK has initialized successfully.
    console.log('Firebase Admin SDK seems to be initialized correctly.');

    // As a final check, we can try a simple, read-only operation.
    // This is optional but provides definitive proof.
    await adminDb.listCollections();
    console.log('Successfully communicated with Firestore via Admin SDK.');

    return NextResponse.json({ status: 'ok', adminSDK: 'initialized' });
  } catch (error) {
    console.error('HEALTH CHECK FAILED:', error);
    return NextResponse.json({ status: 'error', adminSDK: 'failed' }, { status: 500 });
  }
}