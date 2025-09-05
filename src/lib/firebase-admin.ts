
import * as admin from 'firebase-admin';

// This function initializes the Firebase Admin SDK if it hasn't been already.
// It's designed to be safe to call multiple times and ensures the correct
// project is targeted, which is crucial for server environments.
const initializeAdminApp = () => {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set.'
    );
  }

  // Check if an app for the correct project is already initialized.
  const alreadyInitializedApp = admin.apps.find(app => app?.options?.projectId === projectId);
  if (alreadyInitializedApp) {
    return alreadyInitializedApp;
  }
  
  // If not, initialize a new app instance.
  // By not providing a 'credential' object, the SDK will automatically use the
  // service account credentials of the Google Cloud environment (like Cloud Run).
  // This is the most reliable method for authentication on Google Cloud.
  return admin.initializeApp({
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
