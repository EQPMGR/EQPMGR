
import * as admin from 'firebase-admin';
import 'dotenv/config';

let app: admin.app.App;

if (!admin.apps.length) {
    console.log('Firebase Admin SDK Initialization: No apps found, attempting to initialize...');
    try {
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        };

        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey || serviceAccount.privateKey.includes('REPLACE')) {
             console.error('Firebase Admin SDK Initialization Error: Missing or placeholder Firebase Admin SDK credentials. Please check your .env.local file.');
             // Throwing an error here can stop the server from starting, which is good for debugging.
             // For a more resilient approach in production, you might handle this differently.
             throw new Error('Firebase Admin SDK credentials are not configured correctly.');
        }

        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin SDK Initialization: App initialized successfully.');

    } catch (error: any) {
        console.error('Firebase admin initialization error:', error.message);
        // We will not rethrow the error to allow the application to start,
        // but server-side Firebase operations will fail.
    }
} else {
    console.log('Firebase Admin SDK Initialization: App already exists.');
    app = admin.apps[0]!;
}

// It's better to export the initialized services rather than the raw admin object
// to ensure they are always derived from the correctly initialized app.
const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb, admin };
export const adminApp = app;
