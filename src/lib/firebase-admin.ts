
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
        // environment variable for authentication if it's set.
        // Otherwise, it relies on the default credential discovery.
        return admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } catch (error) {
        console.error('Firebase admin initialization error', error);
        // Throw a more descriptive error to help with debugging.
        throw new Error('Failed to initialize Firebase Admin SDK. Check server logs for details.');
    }
};

// We initialize the app once and then export functions to access the services.
// This prevents re-initialization on every server action call.
const adminApp = getAdminApp();
const adminAuth = admin.auth(adminApp);
const adminDb = admin.firestore(adminApp);

export { adminApp, adminAuth, adminDb };
