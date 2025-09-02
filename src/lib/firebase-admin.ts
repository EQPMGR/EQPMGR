
'use server';

import * as admin from 'firebase-admin';
import 'dotenv/config';
import { accessSecret } from './secrets';

// A function to initialize the app, ensuring it only runs once.
const initializeAdminApp = async () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // In a production/Cloud Run environment, fetch from Secret Manager.
  // For local development, it will fall back to .env variables.
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.NODE_ENV === 'production' 
    ? await accessSecret('firebase-client-email') 
    : process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.NODE_ENV === 'production' 
    ? await accessSecret('firebase-private-key')
    : process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin SDK credentials are not set correctly. Check your environment variables or Secret Manager secrets (firebase-client-email, firebase-private-key).');
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
};

// A flag to ensure initialization only runs once
let adminAppInitializationPromise: Promise<admin.app.App> | null = null;

const ensureAdminAppInitialized = () => {
  if (!adminAppInitializationPromise) {
    adminAppInitializationPromise = initializeAdminApp();
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
