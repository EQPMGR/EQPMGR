
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
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  // When running in a Google Cloud environment, the SDK can automatically
  // discover the service account credentials.
  adminApp = admin.initializeApp();
  
  return adminApp;
}

// Initialize the app on first access.
const app = getAdminApp();

// Export the initialized services for use in other server-side files.
export const adminAuth = admin.auth(app);
export const adminDb = admin.firestore(app);
export { app as adminApp };
