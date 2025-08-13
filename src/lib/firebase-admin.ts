
'use server';

import 'dotenv/config';
import * as admin from 'firebase-admin';

// This is the recommended approach for initializing the Admin SDK in Next.js.
// It ensures that the app is only initialized once.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

// We are now exporting the initialized instance directly.
// Files that use this will need to import it.
const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth, adminApp };
