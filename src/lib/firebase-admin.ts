
import * as admin from 'firebase-admin';

// This function initializes the Firebase Admin SDK if it hasn't been already.
// It's safe to call multiple times.
const initializeAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    // This provides a clearer error message if the environment variable is missing.
    throw new Error(
      'FIREBASE_PROJECT_ID environment variable is not set. The Admin SDK requires this to connect to the correct project.'
    );
  }

  // When deployed to App Hosting, the SDK will automatically use the
  // service account credentials from the environment. We explicitly provide
  // the projectId to ensure it matches the client's config.
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: projectId,
  });
};

export async function getAdminDb() {
  const app = initializeAdminApp();
  return admin.firestore(app);
};

export async function getAdminAuth() {
    const app = initializeAdminApp();
    return admin.auth(app);
};
