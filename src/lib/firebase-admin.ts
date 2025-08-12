
import 'dotenv/config';
import * as admin from 'firebase-admin';

// This is the "singleton" pattern. We will keep the initialized app here.
let adminApp: admin.app.App;

/**
 * A function that initializes the Firebase Admin SDK if it hasn't been already.
 * This "lazy initialization" ensures that environment variables are loaded
 * before we attempt to use them.
 * @returns The initialized Firebase Admin App instance.
 */
function getAdminApp(): admin.app.App {
  // If the app is already initialized, return it.
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  // If the app is not initialized, we need to do it now.
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    
  if (!serviceAccountString) {
    // This is a critical error. The server cannot function without credentials.
    // Throwing a clear error is better than letting the app run in a broken state.
    throw new Error(
      'CRITICAL: FIREBASE_SERVICE_ACCOUNT environment variable is not set. The server cannot start without credentials.'
    );
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    
    // Initialize the app and store it in our singleton variable.
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    
    console.log("Firebase Admin SDK initialized successfully.");
    return adminApp;

  } catch (error: any) {
    // This will catch errors like an invalid JSON key.
    console.error("CRITICAL: Firebase Admin SDK initialization failed.", error);
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT or initialize app: ${error.message}`);
  }
}

// Initialize the app on first access.
const app = getAdminApp();

// Export the initialized services for use in other server-side files.
export const adminAuth = admin.auth(app);
export const adminDb = admin.firestore(app);
export { app as adminApp };
