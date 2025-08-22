
'use server';

import * as admin from 'firebase-admin';
import 'dotenv/config';

// A function to initialize the app, ensuring it only runs once.
const initializeAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Firebase Admin SDK credentials are not set in the environment.');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
};

// Export functions that ensure the app is initialized before returning the service.
function getAdminAuth() {
  initializeAdminApp();
  return admin.auth();
}

function getAdminDb() {
  initializeAdminApp();
  return admin.firestore();
}

export const adminApp = initializeAdminApp();
export const adminAuth = getAdminAuth();
export const adminDb = getAdminDb();
export { admin };
