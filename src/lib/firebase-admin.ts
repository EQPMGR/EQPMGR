
import * as admin from 'firebase-admin';

// This is the recommended approach for initializing the Admin SDK in Next.js.
// It ensures that the app is only initialized once per server instance.
if (!admin.apps.length) {
    try {
        // We will initialize with the service account credentials from the .env file.
        // This is a robust way to handle authentication in different environments.
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // The private key needs to be formatted correctly.
            // When stored in .env, newline characters are often replaced with '\\n'.
            // We need to replace them back to actual newlines.
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        };

        // Check if the required service account details are present.
        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
            throw new Error('Missing Firebase Admin SDK credentials. Please check your .env.local file.');
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

    } catch (error) {
        console.error('Firebase admin initialization error', error);
        // Throw a more descriptive error to help with debugging.
        throw new Error('Failed to initialize Firebase Admin SDK. This is often caused by missing or misconfigured service account credentials in the .env.local file.');
    }
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb, admin };
