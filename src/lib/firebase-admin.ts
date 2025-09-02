
'use server';

import * as admin from 'firebase-admin';

// A function to initialize the app, ensuring it only runs once.
const initializeAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // When deployed to a Google Cloud environment, the SDK will automatically
  // detect the project ID and credentials. For local development, this
  // relies on having run `gcloud auth application-default login`.
  return admin.initializeApp();
};

// Initialize the app right away
initializeAdminApp();

// Export functions that return the services from the initialized app.
export async function getAdminAuth() {
  return admin.auth();
}

export async function getAdminDb() {
  return admin.firestore();
}
