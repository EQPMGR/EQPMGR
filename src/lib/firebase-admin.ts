
import * as admin from 'firebase-admin';

// This function initializes the Firebase Admin SDK if it hasn't been already.
// It's designed to be safe to call multiple times.
const initializeAdminApp = () => {
  // Check if an app is already initialized.
  if (admin.apps.length > 0) {
    return admin.app();
  }
  
  // If not, initialize a new app instance.
  // By providing no arguments, the SDK will automatically use the
  // service account credentials of the Google Cloud environment (like Cloud Run)
  // through the GOOGLE_APPLICATION_CREDENTIALS environment variable.
  // This is the most reliable method for authentication on Google Cloud.
  return admin.initializeApp();
};

export async function getAdminDb() {
  const app = initializeAdminApp();
  return admin.firestore(app);
};

export async function getAdminAuth() {
    const app = initializeAdminApp();
    return admin.auth(app);
};
