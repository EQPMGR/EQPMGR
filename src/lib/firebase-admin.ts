
// src/lib/firebase-admin.ts

import * as admin from 'firebase-admin';

// Check if an app is already initialized to prevent errors
if (!admin.apps.length) {
  // When running on Google Cloud, we can initialize with default credentials.
  // For other environments, you might need to provide a service account key file.
  try {
    admin.initializeApp({
      // This tells the Admin SDK to use the application's default service account credentials
      // which are automatically available in the App Hosting/Cloud Run environment.
      credential: admin.credential.applicationDefault(),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);
  }
}

// Export the initialized app and its services
export const adminApp = admin.app();
export const adminAuth = admin.auth(adminApp);
export const adminDb = admin.firestore(adminApp);