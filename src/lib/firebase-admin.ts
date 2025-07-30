
import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : null;

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Initialize without credentials in environments where they are automatically provided
    // (like some Google Cloud environments).
    console.warn("Initializing Firebase Admin SDK without explicit credentials. This is expected in some environments, but may fail otherwise.");
    admin.initializeApp();
  }
}

export const adminApp = admin.apps[0]!;
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
