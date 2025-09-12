
import * as admin from 'firebase-admin';

// This function initializes the Firebase Admin SDK if it hasn't been already.
// It's designed to be safe to call multiple times.
const initializeAdminApp = () => {
  // Check if an app is already initialized.
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // When running on Google Cloud (like Cloud Run), initializeApp() with no arguments 
  // will automatically use the runtime's service account credentials. This is the
  // most reliable method for production.
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
