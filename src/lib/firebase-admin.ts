
'use server';

import * as admin from 'firebase-admin';

// This function initializes the Firebase Admin SDK if it hasn't been already.
// It's safe to call multiple times.
const initializeAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // When deployed to App Hosting, the SDK will automatically use the
  // service account credentials from the environment. For local development,
  // it relies on `gcloud auth application-default login`.
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
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
