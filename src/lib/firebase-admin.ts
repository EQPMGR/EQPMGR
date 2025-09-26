// src/lib/firebase-admin.ts

import * as admin from 'firebase-admin';

// Check if an app is already initialized to prevent re-initialization errors
if (!admin.apps.length) {
  try {
    // When running on App Hosting, this automatically finds the correct
    // service account credentials without any extra configuration.
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    // This log is crucial. If initialization fails, it will now appear in your logs.
    console.error("CRITICAL: Firebase Admin SDK initialization failed:", error);
  }
}

// Export the initialized services directly
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();