
import * as admin from 'firebase-admin';

// This is the recommended approach for initializing the Admin SDK in Next.js.
// It ensures that the app is only initialized once per server instance.
if (!admin.apps.length) {
    try {
        // We will initialize with the application default credentials
        // This is the most robust way to handle authentication in different environments
        // and is the standard practice.
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
    } catch (error) {
        console.error('Firebase admin initialization error', error);
        // Throw a more descriptive error to help with debugging.
        throw new Error('Failed to initialize Firebase Admin SDK. This is often caused by missing or misconfigured GOOGLE_APPLICATION_CREDENTIALS. Please check your server environment setup.');
    }
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb, admin };
