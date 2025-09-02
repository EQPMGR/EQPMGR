
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

// A flag to ensure initialization only runs once
let adminAppInitializationPromise: Promise<admin.app.App> | null = null;

const ensureAdminAppInitialized = () => {
  if (!adminAppInitializationPromise) {
    adminAppInitializationPromise = Promise.resolve(initializeAdminApp());
  }
  return adminAppInitializationPromise;
};


// Export async functions that ensure the app is initialized before returning the service.
export async function getAdminAuth() {
  await ensureAdminAppInitialized();
  return admin.auth();
}

export async function getAdminDb() {
  await ensureAdminAppInitialized();
  return admin.firestore();
}
