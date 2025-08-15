
import * as admin from 'firebase-admin';

// This is the recommended approach for initializing the Admin SDK in Next.js.
// It ensures that the app is only initialized once per server instance.
if (!admin.apps.length) {
    try {
        // We will initialize with the service account credentials from the .env.local file.
        // This is a robust way to handle authentication in different environments.
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // The private key needs to be formatted correctly.
            // When stored in .env, newline characters are often replaced with '\\n'.
            // We need to replace them back to actual newlines.
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        };

        // Add logging for environment variables
        console.log('Firebase Admin SDK Initialization: Checking environment variables...');
        console.log('FIREBASE_PROJECT_ID:', serviceAccount.projectId);
        console.log('FIREBASE_CLIENT_EMAIL:', serviceAccount.clientEmail);
        // Be cautious about logging the private key in full in a real environment
        console.log('FIREBASE_PRIVATE_KEY (first 20 chars):', serviceAccount.privateKey.substring(0, 20) + '...');

        // Check if the required service account details are present.
        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey || serviceAccount.privateKey.includes('REPLACE')) {
            throw new Error('Missing or placeholder Firebase Admin SDK credentials. Please check your .env.local file or environment configuration.'); // Updated error message
        }

        console.log('Firebase Admin SDK Initialization: Initializing app...'); // Add logging before initialization
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin SDK Initialization: App initialized successfully.'); // Add logging after successful initialization
    } catch (error) {
        console.error('Firebase admin initialization error', error);
        // Throw a more descriptive error to help with debugging.
        throw new Error('Failed to initialize Firebase Admin SDK. This is often caused by missing or misconfigured service account credentials in the .env.local file.');
    }
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb, admin };
