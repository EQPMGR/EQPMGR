
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

        // Add logging for environment variables
        console.log('Firebase Admin SDK Initialization: Checking environment variables...');
        console.log('FIREBASE_PROJECT_ID:', serviceAccount.projectId ? 'Loaded' : 'MISSING');
        console.log('FIREBASE_CLIENT_EMAIL:', serviceAccount.clientEmail ? 'Loaded' : 'MISSING');
        // Be cautious about logging the private key in full in a real environment
        if (serviceAccount.privateKey) {
          console.log('FIREBASE_PRIVATE_KEY: Loaded');
        } else {
          console.log('FIREBASE_PRIVATE_KEY: MISSING');
        }
        
        // Check if the required service account details are present.
        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey || serviceAccount.privateKey.includes('REPLACE')) {
            throw new Error('Missing or placeholder Firebase Admin SDK credentials. Please check your .env file or environment configuration.');
        }

        console.log('Firebase Admin SDK Initialization: Initializing app...');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin SDK Initialization: App initialized successfully.');
    } catch (error: any) {
        console.error('Firebase admin initialization error:', error.message);
        // We don't rethrow here to allow the app to run, but the error will be logged.
        // Server-side actions requiring admin privileges will likely fail.
    }
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

const adminApp = admin; // Explicitly name and export the app instance
export { adminAuth, adminDb, adminApp, admin };
