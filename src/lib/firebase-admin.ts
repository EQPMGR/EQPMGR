
import * as admin from 'firebase-admin';

// This function initializes the Firebase Admin SDK if it hasn't been already.
// It's safe to call multiple times.
const initializeAdminApp = () => {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    // This provides a clearer error message if the environment variable is missing.
    throw new Error(
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set. The Admin SDK requires this to connect to the correct project.'
    );
  }

  // Check if an app with the correct project ID is already initialized
  const alreadyInitializedApp = admin.apps.find(app => app?.options?.projectId === projectId);
  if (alreadyInitializedApp) {
    return alreadyInitializedApp;
  }
  
  // If not, initialize it. When running on Google Cloud, the SDK will automatically
  // use the runtime's service account credentials. We don't need to specify them.
  return admin.initializeApp({
    projectId: projectId,
  }, `app-for-${projectId}`); // Use a unique name for the app instance
};

export async function getAdminDb() {
  const app = initializeAdminApp();
  return admin.firestore(app);
};

export async function getAdminAuth() {
    const app = initializeAdminApp();
    return admin.auth(app);
};
