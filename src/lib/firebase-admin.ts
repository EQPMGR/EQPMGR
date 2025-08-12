
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

  // Initialize the app with default credentials and store it.
  // This is the standard method for environments like this.
  adminApp = admin.initializeApp();
  
  console.log("Firebase Admin SDK initialized successfully.");
  return adminApp;
}

// Initialize the app on first access.
const app = getAdminApp();

// Export the initialized services for use in other server-side files.
export const adminAuth = admin.auth(app);
export const adminDb = admin.firestore(app);
export { app as adminApp };
