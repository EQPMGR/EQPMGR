
'use server';

import 'dotenv/config';
import * as admin from 'firebase-admin';

// This is the "singleton" pattern. We will keep the initialized app here.
let adminApp: admin.app.App;

/**
 * A function that initializes the Firebase Admin SDK if it hasn't been already.
 * This "lazy initialization" ensures that environment variables are loaded
 * before we attempt to use them.
 * @returns The initialized Firebase Admin App instance.
 */
function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  // When running in a Google Cloud environment, the SDK can automatically
  // discover the service account credentials. This is the standard practice.
  adminApp = admin.initializeApp();
  
  return adminApp;
}

// Export functions that return the initialized services.
// This is required for compatibility with Next.js "use server".
export async function getAdminAuth() {
  return admin.auth(getAdminApp());
}

export async function getAdminDb() {
  return admin.firestore(getAdminApp());
}

// Re-exporting the app instance itself for any cases that need it directly.
export { getAdminApp as adminApp };
