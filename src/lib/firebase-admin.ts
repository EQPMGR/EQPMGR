
import * as admin from 'firebase-admin';
import 'dotenv/config'; // Directly load environment variables here.

// Re-structure to provide clearer error handling and logging.
let adminApp: admin.app.App;

if (!admin.apps.length) {
  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    // --- START DEBUG LOGGING ---
    console.log("--- Firebase Admin SDK Initialization ---");
    if (!serviceAccountString) {
      console.error("[DEBUG] FIREBASE_SERVICE_ACCOUNT environment variable is NOT SET.");
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT environment variable is not set. This is required for the Admin SDK to authenticate.'
      );
    } else {
      console.log("[DEBUG] FIREBASE_SERVICE_ACCOUNT is present.");
    }
    // --- END DEBUG LOGGING ---

    const serviceAccount = JSON.parse(serviceAccountString);
    
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully with service account.");

  } catch (error: any) {
    console.error("Firebase Admin SDK initialization failed:", error.message);
    if (error.message.includes('JSON.parse')) {
        console.error("[DEBUG] The service account string appears to be malformed. Ensure it's a valid JSON object.");
    }
    console.error("Please ensure that the FIREBASE_SERVICE_ACCOUNT environment variable is a valid JSON string and the service account has the necessary permissions in your Google Cloud project.");
    // In case of failure, we still need to export the objects, but they will not be functional.
    // The app will throw errors when trying to use them, which is the expected behavior.
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    adminApp = admin.apps[0]!;
  }
} else {
  adminApp = admin.apps[0]!;
}

export const adminAuth = admin.auth(adminApp);
export const adminDb = admin.firestore(adminApp);
export { adminApp };
