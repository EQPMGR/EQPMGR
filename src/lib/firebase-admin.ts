
import * as admin from 'firebase-admin';

// This function initializes the Firebase Admin SDK if it hasn't been already.
// It's designed to be safe to call multiple times.
const initializeAdminApp = () => {
  // Check if an app is already initialized.
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // When running on Google Cloud (like Cloud Run), the GAE_RUNTIME environment variable will be set.
  // In this case, initializeApp() with no arguments will automatically use the runtime's
  // service account credentials, which is the most reliable method.
  if (process.env.GAE_RUNTIME) {
    return admin.initializeApp();
  } else {
    // For local development, we explicitly provide the projectId to ensure the Admin SDK
    // targets the correct Firebase project ("eqpmgr-test") and avoids defaulting to a
    // placeholder project like "monospace-2".
    return admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
};

export async function getAdminDb() {
  const app = initializeAdminApp();
  return admin.firestore(app);
};

export async function getAdminAuth() {
    const app = initializeAdminApp();
    return admin.auth(app);
};
