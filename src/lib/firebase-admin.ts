
import * as admin from 'firebase-admin';
import 'dotenv/config';

let adminApp: admin.app.App;

if (!admin.apps.length) {
  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccountString) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT environment variable is not set. This is required for the Admin SDK to authenticate.'
      );
    }

    const serviceAccount = JSON.parse(serviceAccountString);
    
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    console.log("Firebase Admin SDK initialized successfully for project:", serviceAccount.project_id);

  } catch (error: any) {
    console.error("CRITICAL: Firebase Admin SDK initialization failed:", error.message);
    // If initialization fails, we cannot proceed. Throwing the error will stop the server
    // and provide a clear log in the console, which is better than silent failure.
    throw error;
  }
} else {
  adminApp = admin.apps[0]!;
  console.log("Firebase Admin SDK was already initialized.");
}

export const adminAuth = admin.auth(adminApp);
export const adminDb = admin.firestore(adminApp);
export { adminApp };
