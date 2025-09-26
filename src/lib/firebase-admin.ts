// src/lib/firebase-admin.ts

import admin from 'firebase-admin';

if (!admin.apps.length) {
  // In a Google Cloud environment like App Hosting, this is all you need.
  // It automatically finds the service account credentials.
  admin.initializeApp();
}

// Export the services directly for use in your API routes
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();