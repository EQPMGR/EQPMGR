
'use server';

import 'dotenv/config';
import * as admin from 'firebase-admin';

// This is the recommended approach for initializing the Admin SDK in Next.js.
// It ensures that the app is only initialized once per server instance.
const getAdminApp = () => {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }
    try {
        // This will automatically use the GOOGLE_APPLICATION_CREDENTIALS
        // environment variable for authentication.
        return admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } catch (error) {
        console.error('Firebase admin initialization error', error);
        throw new Error('Failed to initialize Firebase Admin SDK. Check server logs.');
    }
};

// Export functions that return the initialized services.
// This is required for compatibility with Next.js "use server".
// The functions must be async.
export async function getAdminAuth() {
  return admin.auth(getAdminApp());
}

export async function getAdminDb() {
  return admin.firestore(getAdminApp());
}

// Re-exporting the app instance itself for any cases that need it directly.
export { getAdminApp as adminApp };
